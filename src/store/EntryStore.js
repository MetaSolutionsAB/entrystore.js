/*global define*/
define([
    "dojo/_base/lang",
    "store/Cache",
    "store/rest",
    "store/factory",
    "store/types",
    "store/PrototypeEntry",
    'store/User',
    "dojo/has"
], function (lang, Cache, rest, factory, types, PrototypeEntry, User, has) {

    /**
     * @param {String=} baseURI is an optional URL to the current EntryStore
     * @param {String=} credentials is optional, see the auth method.
     * @class
     */
    var EntryStore = function (baseURI, credentials) {
        /**
         * @type {String}
         */
        if (has("host-browser") && baseURI == null) {
            this._baseURI = window.location.origin+"/store/";
        } else {
            this._baseURI = baseURI;
            if (this._baseURI[this._baseURI.length-1] !== "/") {
                this._baseURI = this._baseURI+"/";
            }
        }

        this._cache = new Cache();
        if (credentials) {
            this.auth(credentials);
        }
        this._contexts = {};
        this._rest = rest;
    };

    EntryStore.prototype.getUserInfo = function() {
        return this._rest.get(this._baseURI + "auth/user");
    };

    EntryStore.prototype.getUserEntry = function() {
        return this._rest.get(this._baseURI + "auth/user").then(lang.hitch(this, function(data) {
            return this.getEntry(this.getEntryURI("_principals", data.id));
        }));
    };

    /**
     * Authenticate using
     * @param {Object} credentials containing a user, password and potentially a maxAge for cookie lifecycle
     */
    EntryStore.prototype.auth = function (credentials) {
        if (credentials) {
            credentials.base = this.getBaseURI();
        }
        var promise = this._rest.auth(credentials);
        this.invalidateCache();
        return promise;
    };

    EntryStore.prototype.logout = function () {
        return this.auth();
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
                throw "Failed fetching entry. " + err;
            });
        }
    };

    /**
     * Retrieves a Context instance, the entry for the context is not loaded by default, you can call Context.getOwnEntry() to achieve that.
     *
     * @param {String} contextEntryURI is the URI to the contexts entry, e.g. base/_contexts/entry/1.
     * @return {store.Context}
     */
    EntryStore.prototype.getContext = function (contextEntryURI) {
        return factory.getContext(this, contextEntryURI);
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
     */
    EntryStore.prototype.createEntry = function (prototypeEntry) {
        var postURI = factory.getEntryCreateURI(prototypeEntry, prototypeEntry.getParentList());
        var postParams = factory.getEntryCreatePostData(prototypeEntry);
        return this._rest.post(postURI, postParams).then(
            lang.hitch(this, function(data) {
                var euri = factory.getURIFromCreated(data, prototypeEntry.getContext());
                return this.getEntry(euri);
            })
        );
    };

    /**
     * @returns {store.PrototypeEntry}
     */
    EntryStore.prototype.newContext = function (id) {
        var _contexts = factory.getContext(this, this._baseURI + "_contexts/entry/_contexts");
        return new PrototypeEntry(_contexts, id).setGraphType(types.GT.CONTEXT);
    };

    /**
     * @returns {store.PrototypeEntry}
     */
    EntryStore.prototype.newUser = function (username, password, homeContext, id) {
        var _principals = factory.getContext(this, this._baseURI + "_contexts/entry/_principals");
        var pe = new PrototypeEntry(_principals, id).setGraphType(types.GT.USER);
        var ei = pe.getEntryInfo();
        var user = new User(ei.getEntryURI(), ei.getResourceURI(), this, {});
        pe.entry._resource = user;
        if (username != null) {
            user.setName(username);
        }
        if (password != null) {
            user.setPassword(password);
        }
        if (homeContext != null) {
            user.setHomeContext(homeContext);
        }
        return pe;
    };

    /**
     * @returns {store.PrototypeEntry}
     */
    EntryStore.prototype.newGroup = function (id) {
        var _principals = factory.getContext(this, this._baseURI + "_contexts/entry/_principals");
        return new PrototypeEntry(_principals, id).setGraphType(types.GT.GROUP);
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
    EntryStore.prototype.getEntryURI = function (contextId, entryId) {
        return factory.getEntryURI(this, contextId, entryId);
    };

    EntryStore.prototype.getContextById = function (id) {
        return factory.getContext(this, this._baseURI + "_contexts/entry/"+id);
    };

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
