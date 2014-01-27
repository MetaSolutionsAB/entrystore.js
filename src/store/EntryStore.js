/*global define*/
define([
    "dojo/_base/lang",
    "store/Cache",
    "store/rest",
    "store/factory",
    "dojo/has"
], function (lang, Cache, rest, factory, has) {

    /**
     * @param {String=} baseURI is an optional URL to the current EntryStore
     * @param {String=} authScheme is optional, see the auth method.
     * @param {String=} credentials is optional, see the auth method.
     * @class
     */
    var EntryStore = function (baseURI, authScheme, credentials) {
        /**
         * @type {String}
         */
        if (has("host-browser") && baseURI == null) {
            var href = window.location.href, host = window.location.host;
            var idx = href.indexOf(host)+host.length;
            var path = href.substr(idx).match(/^\/([^\/]*)\/.*/)[1];
            this._baseURI = href.substr(0,idx+1)+path+"/";
        } else {
            this._baseURI = baseURI;
            if (this._baseURI[this._baseURI.length-1] !== "/") {
                this._baseURI = this._baseURI+"/";
            }
        }

        this._cache = new Cache();
        if (authScheme) {
            this.auth(authScheme, credentials);
        }
        this._contexts = {};
        this._rest = rest;
    };

    EntryStore.prototype.auth = function (authScheme, credentials) {
        this._rest.auth(authScheme, credentials);
        this.invalidateCache();
    };

    EntryStore.prototype.logout = function () {
        this.auth();
    };

    /**
     * @param {String} entryURI is the entry URI of an entry.
     * @param {Object=} optionalLoadParams is optional parameters for how to load an entry, mainly relevant when the entry is a list.
     * @return {dojo.promise.Promise} a Promise which on success provides an Entry instance.
     */
    EntryStore.prototype.getEntry = function (entryURI, optionalLoadParams) {
        var forceLoad = optionalLoadParams ? optionalLoadParams.forceLoad === true : false;
        var e = this._cache.get(entryURI);
        if (e && !forceLoad) {
            return e.refresh(); //Will only refresh if needed, a promise is returned in any case
        } else {
            var self = this;
            var entryLoadURI = factory.getEntryLoadURI(entryURI, optionalLoadParams);
            return this._rest.get(entryLoadURI).then(function (data) {
                //The entry, will always be there.
                return factory.updateOrCreate(entryURI, data, self);
            }, function (err) {
                return "Failed fetching entry. " + err;
            });
        }
    };

    /**
     * Retrieves a Context instance, the entry for the context is not loaded by default, you can call Context.getOwnEntry() to achieve that.
     *
     * @param {String} contextEntryURI is the URI to the contexts entry, e.g. base/_contexts/entry/1.
     * @return {dojo.promise.Promise} that on success yields a Context instance. If you prefer to get the entry for the context use the getEntry method instead.
     */
    EntryStore.prototype.getContext = function (contextEntryURI) {
        var d = this.getEntry(contextEntryURI).then(function (entry) {
            if (entry.isContext()) {
                return entry.getResource();
            } else {
                d.reject("Specified URI does not correspond to a context (an entry with a context resource).");
            }
        });
        return d;
    };

    /**
     * @return {store.List} of entries that have contexts as resources.
     */
    EntryStore.prototype.getContextList = function () {
        return factory.getList(this, this._baseURI + "_contexts/entry/_all");
    };

    /**
     * @return {store.List} of entries that have principals as resources.
     */
    EntryStore.prototype.getPrincipalList = function () {
        return factory.getList(this, this._baseURI + "_principals/entry/_all");
    };


    /**
     * @param {store.PrototypeEntry} prototypeEntry a fake entry that acts as a prototype, i.e. containing characteristics of the to be created entry. Must be provided, includes which context the entry should be created in.
     * @param {store.Entry} parentListEntry an entry corresponding to a list to which the entry should be added as a child.
     */
    EntryStore.prototype.createEntry = function (prototypeEntry, parentListEntry) {
        var postURI = factory.getEntryCreateURI(prototypeEntry, parentListEntry);
        var postParams = factory.getEntryCreatePostData(prototypeEntry);
        return this._rest.post(postURI, postParams).then(
            lang.hitch(this, function(data) {
                var euri = factory.getURIFromCreated(data, prototypeEntry.getContext());
                return this.getEntry(euri);
            }),
            function (err) {
                return "Failed creating entry. " + err;
            }
        );
    };

    /**
     * @returns {store.PrototypeEntry}
     */
    EntryStore.prototype.createPrototypeEntryForContext = function () {
        var _contexts = factory.getContext(this, this._baseURI + "_contexts/entry/_contexts");
        return factory.createPrototypeEntry(_contexts).setGraphType("Context");
    };

    /**
     * @returns {store.PrototypeEntry}
     */
    EntryStore.prototype.createPrototypeEntryForPrincipal = function () {
        var _principals = factory.getContext(this, this._baseURI + "_contexts/entry/_principals");
        return factory.createPrototypeEntry(_principals).setGraphType("Context");
    };

    /**
     * Convenience function.
     *
     * @param {Function} listener
     * @see store.Cache#addCacheUpdateListener
     */
    EntryStore.prototype.addCacheUpdateListener = function (listener) {
        this._cache.addCacheUpdateListener(listener);
    };

    /**
     * Convenience function.
     *
     * @param {Function} listener
     * @see store.Cache#removeCacheUpdateListener
     */
    EntryStore.prototype.removeCacheUpdateListener = function (listener) {
        this._cache.removeCacheUpdateListener(listener);
    };

    /**
     * Convenience function.
     *
     * @see store.Cache#allNeedRefresh
     */
    EntryStore.prototype.invalidateCache = function () {
        this._cache.allNeedRefresh();
    };

    EntryStore.prototype.version = function () {
        //TODO
    };

    EntryStore.prototype.status = function () {
        //TODO admin only
    };

    EntryStore.prototype.moveEntry = function (entry, fromList, toList) {
        var uri = factory.getMoveURI(entry, fromList, toList, this._baseURI);
        return this._rest.post(uri, "");
    };

    EntryStore.prototype.loadViaProxy = function (uri, formatHint) {
        var url = factory.getProxyURI(uri, formatHint);
        return this._rest.get(url);
    };

    EntryStore.prototype.createSearchList = function (query) {
        return factory.createSearchList(this, query);
    };

    //==============Non-public methods==============

    /**
     * @returns {String}
     */
    EntryStore.prototype.getBaseURI = function () {
        return this._baseURI;
    };

    /**
     * @returns {store.Cache}
     */
    EntryStore.prototype.getCache = function () {
        return this._cache;
    };

    /**
     * @returns {store.rest}
     */
    EntryStore.prototype.getREST = function () {
        return this._rest;
    };

    /**
     * @returns {Object}
     */
    EntryStore.prototype.getCachedContextsIdx = function () {
        return this._contexts;
    };

    // TODO user and group handling (get/add/update/remove)
    return EntryStore;
});
