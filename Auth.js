/*global define*/

define([
    "dojo/_base/lang",
    "dojo/json",
    "store/Cache",
    "store/rest",
    "store/factory",
    "store/types",
    "store/PrototypeEntry",
    'store/User',
    "dojo/has"
], function (lang, json, Cache, rest, factory, types, PrototypeEntry, User, has) {

    /**
     * EntryStore is the main class that is used to connect to a running server-side EntryStore repository.
     * @exports store/EntryStore
     * @param {String=} baseURI - URL to the EntryStore repository we should communicate with, may be left out and
     * guessed if run in a browser environment (appends "/store/" to the window.location.origin)
     * @param {Object=} credentials - same as provided in the {@link store/EntryStore#auth auth} method.
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

    var _listenerCounter = 0;
    var _listenersIdx = {};
    var _messageListeners = function(topic, obj) {
        for (var alid in _listenersIdx) {
            if (_listenersIdx.hasOwnProperty(alid)) {
                _listenersIdx[clid](topic, obj);
            }
        }
    };

    EntryStore.prototype.addAuthListener = function(listener) {
        if (listener.__alid != null) {
            listener.__alid = "idx_"+_listenerCounter;
            _listenerCounter++;
        }
        _listenersIdx[listener.__alid] = listener;
    };

    EntryStore.prototype.removeAuthListener = function(listener) {
        if (listener.__alid != null) {
            delete _listenersIdx[listener.__alid];
        }
    };

    /**
     * Yields information about who currently is authenticated against the EntryStore repository.
     * @returns {userInfoPromise} - upon success an object containing attributes "user" being the username, "id" of the user entry,
     * and "homecontext" being the entry-id of the home context is provided.
     * @see {@link store/EntryStore#auth auth}
     * @see {@link store/EntryStore#logout logout}
     */
    EntryStore.prototype.getUserInfo = function() {
        return this._rest.get(this._baseURI + "auth/user").then(function(userinfo) {
            _messageListeners("userInfo", userinfo);
            return userinfo;
        });
    };

    /**
     * @returns {entryPromise} on success the entry for the currently signed in user is provided.
     */
    EntryStore.prototype.getUserEntry = function() {
        return this._rest.get(this._baseURI + "auth/user").then(lang.hitch(this, function(data) {
            return this.getEntry(this.getEntryURI("_principals", data.id)).then(function(userEntry) {
                _messageListeners("userEntry", userEntry);
                return userEntry;
            });
        }));
    };

    /**
     * Authenticate using credentials containing a user, a password and an optional maxAge given in seconds.
     *
     * @param {object} - credentials as a parameter object
     */
    EntryStore.prototype.auth = function (credentials) {
        if (credentials) {
            credentials.base = this.getBaseURI();
        } else {
            credentials = {base: this.getBaseURI(), logout: true};
        }
        var promise = this._rest.auth(credentials).then(function(authObj) {
            _messageListeners("auth", authObj);
            return authObj;
        });
        this.getCache().allNeedRefresh();
        return promise;
    };

    /**
     * Logout the currently authorized user.
     * @returns {xhrPromise}
     */
    EntryStore.prototype.logout = function () {
        return this.auth();
    };

    /**
     * Fetches an entry given an entryURI. If the entry is already loaded and available in the cache it will be returned directly,
     * otherwise it will be loaded from the repository. If the entry is already loaded but marked as in need of a refresh
     * it will be refreshed first.
     *
     * The optional load parameters are provided in a single parameter object with five possible attributes.
     * Below we outline these attributes, the first two (forceLoad and direct) applies to all kind of entries while
     * the following three (limit, offset and sort) only applies if the entry is a list:
     *
     * * forceLoad - ignores if the entry is already in the cache and fetches the entry from the repository
     * * direct - returns the entry from the cache directly rather than returning a promise, if the entry is not in the
     * cache an undefined value will be returned.
     * * limit - only a limited number of children are loaded, -1 means no limit, 0, undefined or if the attribute
     * is not provided means that the default limit of 20 is used.
     * * offset - only children from offest and forward is returned, has to be positive to take effect.
     * * sort - information on how to sort the children:
     *     * if sort is not provided at all or an empty object is provided the members of the list will not be sorted,
     *     instead the list's natural order will be used
     *     * if sort is given as null the defaults will be used ({sortBy: "title", prio: "List"}).
     *     * if sort is given as a non emtpy object the following attributes are taken into account:
     *         * sortBy - the attribute instructs which metadata field to sort the children by, i.e., title, created, modified, or size.
     *         * lang - if sort is title and the title is provided in several languages a prioritized language can be given.
     *         * prio - allows specific graphtypes to be prioritized (e.g. show up in the top of the list).
     *         * descending - if true the children are shown in descending order.
     *
     *
     * **Note** - in the case where the entry is a list it is possible to change the limit, offset and sort later by
     * calling the corresponding methods on the {@link store/List} resource, e.g. {@link store/List#setSort}. However,
     * setting the values already in this method call has as a consequence that one less request to the repository is
     * made as you will get members (in the right amount and order) in the same request as you get metadata and other
     * information.
     *
     * A request of a list entry can look like:
     *
     *     var euri = entrystore.getEntryURI("1", "1");
     *     entrystore.getEntry(euri, {
     *          forceLoad: true,
     *          limit: 10,
     *          offset: 20,
     *          sort: {
     *             sortBy: "modified",
     *             prio: types.GT_LIST
     *          }
     *      });
     *
     * The optional params here says that we force a load from the repository, that we want the results
     * to be paginated with a limit of 10 entries per page and that we want page 3. We also indicate that we
     * want the list to be sorted by latest modification date and that if there are member entries that are lists they
     * should be sorted to the top.
     *
     * @param {string} entryURI - the entryURI for the entry to retrieve.
     * @param {Object=} optionalLoadParams - parameters for how to load an entry.
     * @return {entryPromise | store/Entry | undefined} - by default a promise is returned, if the
     * direct parameter is specified the entry is returned directly or undefined if the entry is not in cache.
     * @see {@link store/EntryStore#getEntryURI getEntryURI} for help to construct entry URIs.
     * @see {@link store/Context#getEntryById} for loading entrys relative to a context.
     */
    EntryStore.prototype.getEntry = function (entryURI, optionalLoadParams) {
        var forceLoad = optionalLoadParams ? optionalLoadParams.forceLoad === true : false;
        var e = this._cache.get(entryURI);
        if (optionalLoadParams != null && optionalLoadParams.direct === true) {
            return e;
        }
        if (e && !forceLoad) {
            if ((e.isList() || e.isGroup()) && optionalLoadParams != null) {
                var list = e.getResource(true); //Direct access works for lists and groups.
                list.setLimit(optionalLoadParams.limit);
                list.setSort(optionalLoadParams.sort);
            }

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
     * Retrieves entries from a list. One way to see it is that this is a convenience method that retrieves a list entry,
     * its member entries and returns those in an array.
     *
     * @param {string} entryURI - URI of the list entry to load entries from.
     * @param {Object} sort - same sort object as provided in the optionalLoadParams to {@see store/EntryStore#getEntry getEntry} method.
     * @param {Object} limit - same limit as provided in the optionalLoadParams to {@see store/EntryStore#getEntry getEntry} method.
     * @param {integer} page - unless limit is set to -1 (no pagination) we need to specify which page to load, first page is 0.
     * @returns {entryArrayPromise} upon success the promise returns an array of entries.
     */
    EntryStore.prototype.getListEntries = function(entryURI, sort, limit, page) {
        var d = new Deferred();
        var op = {};
        if (sort != null) {
            op.sort = sort;
        }
        if (limit % 1 === 0) {
            op.limit = limit;
        }
        if (page % 1 === 0) {
            if (limit % 1 === 0) {
                op.offset = limit*page;
            } else {
                op.offset =factory.getDefaultLimit()*page;
            }
        }
        this.getEntryStore().getEntry(entryURI, op).then(function(entry) {
            var list = entry.getResource(true);
            list.getEntries(page).then(function(entries) {
                d.resolve(entries, list);
            }, function(err) {
                d.reject(err);
            });
        }, function(err) {
            d.reject("Failed fetching all entries. "+err);
        });
        return d.promise;
    };

    /**
     * Retrieves a Context instance via its id. Note that this method returns directly without checking with the
     * EntryStore repository that the context exists. Hence successive operations via this context instance may fail
     * if the context does not exist in the EntryStore repository.
     *
     * Note that in EntryStore everything is connected to entries. Hence a context is nothing else than a
     * special kind of resource maintained by an entry. This entry provides metadata about the context as
     * well as the default ownership and access control that applies to all entries inside of this context.
     *
     * To get a hold of the contexts own entry use the {@link store/Resource#getEntry getEntry} method on the context
     * (inherited from the generic {@link store/Resource} class.
     *
     * Advanced: Entrys corresponding to contexts are stored in the special _contexts context which, since it is a context,
     * contains its own entry.
     *
     * @param {string} contextId - identifier for the context (not necessarily the same as the alias/name for the context)
     * @return {store/Context}
     */
    EntryStore.prototype.getContextById = function (contextId) {
        return factory.getContext(this, this._baseURI + "_contexts/entry/"+contextId);
    };

    /**
     * Retrieves a Context instance via its entry's URI.
     *
     * @param {String} contextEntryURI - URI to the context's entry, e.g. base/_contexts/entry/1.
     * @returns {store/Context}
     * @see {@link store/EntryStore#getContextById getContextById}
     */
    EntryStore.prototype.getContext = function (contextEntryURI) {
        return factory.getContext(this, contextEntryURI);
    };

    /**
     * Retrieves a paginated list of all contexts in the EntryStore repository.
     * @return {store/List} - the list contains entries which have contexts as resources.
     */
    EntryStore.prototype.getContextList = function () {
        return factory.getList(this, this._baseURI + "_contexts/entry/_all");
    };

    /**
     * Retrieves a paginated list of all users and groups in the EntryStore repository
     * @return {store/List} the list contains entries that have principals as resources.
     * @todo May include folders and other entries as well...
     */
    EntryStore.prototype.getPrincipalList = function () {
        return factory.getList(this, this._baseURI + "_principals/entry/_all");
    };

    /**
     * Creates a new entry according to information in the provided {@link store/PrototypeEntry}.
     * The information specifies the type of entry, which context it should reside in, initial metadata etc.
     * This method is seldom called explicitly, instead it is called indirectly via the
     * {@link store/PrototypeEntry#commit} method. E.g.:
     *
     *     context.newEntry().commit().then(function(newlyCreatedEntry) {...}
     *
     * @param {store/PrototypeEntry} prototypeEntry - information about the entry to create.
     * @return {dojo/promise/Promise}
     * @see store/PrototypeEntry#commit
     * @see store/EntryStore#newContext
     * @see store/EntryStore#newUser
     * @see store/EntryStore#newGroup
     * @see store/Context#newEntry
     * @see store/Context#newLink
     * @see store/Context#newLinkRef
     * @see store/Context#newRef
     * @see store/Context#newList
     * @see store/Context#newGraph
     * @see store/Context#newString
     */
    EntryStore.prototype.createEntry = function (prototypeEntry) {
        var postURI = factory.getEntryCreateURI(prototypeEntry, prototypeEntry.getParentList());
        var postParams = factory.getEntryCreatePostData(prototypeEntry);
        return this._rest.create(postURI, postParams).then(
            lang.hitch(this, function(euri) {
                //var euri = factory.getURIFromCreated(data, prototypeEntry.getContext());
                var plist = prototypeEntry.getParentList();
                if (plist != null) {
                    var res = plist.getResource(true);
                    if (res != null && res.needRefresh) {
                        plist.getResource(true).needRefresh();
                    }
                }
                return this.getEntry(euri);
            })
        );
    };

    /**
     * Provides a PrototypeEntry for creating a new context.
     * @param {string=} id - requested identifier for the context
     * @returns {store/PrototypeEntry}
     */
    EntryStore.prototype.newContext = function (id) {
        var _contexts = factory.getContext(this, this._baseURI + "_contexts/entry/_contexts");
        return new PrototypeEntry(_contexts, id).setGraphType(types.GT_CONTEXT);
    };


    EntryStore.prototype.createGroupAndContext = function(name) {
        var uri = this._baseURI+"_principals/groups";
        if (name != null) {
            uri += "?name="+encodeURIComponent(name);
        }
        return this._rest.create(uri).then(lang.hitch(this, function(location) {
                return this.getEntry(location);
        }));
    };

    /**
     * Provides a PrototypeEntry for creating a new user.
     * @param {string=} username - the name the user will use to authenticate himself
     * @param {string=} password - the password the user will use to authenticate himself
     * @param {string=} homeContext - a specific context the user will consider his own home
     * @param {string=} id - requested identifier for the user
     * @returns {store/PrototypeEntry}
     */
    EntryStore.prototype.newUser = function (username, password, homeContext, id) {
        var _principals = factory.getContext(this, this._baseURI + "_contexts/entry/_principals");
        var pe = new PrototypeEntry(_principals, id).setGraphType(types.GT_USER);
        var ei = pe.getEntryInfo();
        var data = {};
        if (username != null) {
            data.name = username;
        }
        if (password != null) {
            data.password = password;
        }
        if (homeContext != null) {
            data.homecontext = homeContext;
        }
        var user = new User(ei.getEntryURI(), ei.getResourceURI(), this, data);
        pe._resource = user;
        return pe;
    };

    /**
     * @param {string=} id - requested identifier for the group
     * @returns {store/PrototypeEntry}
     */
    EntryStore.prototype.newGroup = function (id) {
        var _principals = factory.getContext(this, this._baseURI + "_contexts/entry/_principals");
        return new PrototypeEntry(_principals, id).setGraphType(types.GT_GROUP);
    };

    /**
     * Move an entry from one list to another.
     *
     * @param {store/Entry} entry - entry to move
     * @param {store/Entry} fromList - source list where the entry is currently residing.
     * @param {store/Entry} toList - destination list where the entry is supposed to end up.
     * @returns {xhrPromise}
     */
    EntryStore.prototype.moveEntry = function (entry, fromList, toList) {
        var uri = factory.getMoveURI(entry, fromList, toList, this._baseURI);
        return this._rest.post(uri, "");
    };

    /**
     * Loads data via the EntryStore repository's own proxy.
     *
     * @param {string} uri indicates the resource to load.
     * @param {string} formatHint indicates that you want data back in the format specified
     * (e.g. by specifiying a suitable accept header).
     * @returns {xhrPromise}
     */
    EntryStore.prototype.loadViaProxy = function (uri, formatHint) {
        var url = factory.getProxyURI(this._baseURI, uri, formatHint);
        return this._rest.get(url);
    };

    /**
     * Performing searches against an EntryStore repository is achieved by creating a
     * {@link store/SearchList} which is similar to a regular {@link store/List}.
     * From this list it is possible to get paginated results in form of matching entries.
     * In the following code example the solr variable corresponds to the {@link store/solr} query module:
     *
     *     var personType = "http://xmlns.com/foaf/0.1/Person";
     *     var searchList = entrystore.createSearchList(solr().rdfType(personType));
     *     searchList.setLimit(20).getEntries().then(function(results) {...});
     *
     * @param {object} query implementation of some sort, e.g. {@link store/solr}.
     * @returns {store/SearchList}
     */
    EntryStore.prototype.createSearchList = function (query) {
        return factory.createSearchList(this, query);
    };

    /**
     * Constructs an entry URI from the id for the context and the specific entry.
     * @param {string} contextId - an identifier for the context the entry belongs to
     * @param {string} entryId - an identifier for the entry
     * @returns {String} - an entry URI
     */
    EntryStore.prototype.getEntryURI = function (contextId, entryId) {
        return factory.getEntryURI(this, contextId, entryId);
    };

    /**
     * Constructs an entry resource URI (local URI, not a link obviously) from the id for the
     * context and the specific entry.
     *
     * @param {string} contextId - an identifier for the context the resource belongs to
     * @param {string} entryId - an identifier for the entry the resource belongs to
     * @returns {String} a resource URI
     */
    EntryStore.prototype.getResourceURI = function (contextId, entryId) {
        return factory.getResourceURI(this, contextId, entryId);
    };

    /**
     * The base URI of the EntryStore repository we have connected to.
     *
     * @returns {String}
     */
    EntryStore.prototype.getBaseURI = function () {
        return this._baseURI;
    };

    /**
     * The entry id of this entry, resource or metadata uri.
     *
     * @param {string} uri
     * @returns {string}
     */
    EntryStore.prototype.getEntryId = function(uri) {
        return factory.getEntryId(uri, this.getBaseURI());
    };

    /**
     * The context id of this entry, resource or metadata uri.
     *
     * @param {string} uri
     * @returns {string}
     */
    EntryStore.prototype.getContextId = function(uri) {
        return factory.getContextId(uri, this.getBaseURI());
    };

    /**
     * The cache where all entries are cached after loading.
     *
     * @returns {store/Cache}
     */
    EntryStore.prototype.getCache = function () {
        return this._cache;
    };

    /**
     * The loading mechanism are performed via REST calls, this REST module can be
     * used for doing manual lookups outside of the scope of this API.
     *
     * @returns {store/rest}
     */
    EntryStore.prototype.getREST = function () {
        return this._rest;
    };

    //==============Non-public methods==============

    /**
     * @returns {Object}
     */
    EntryStore.prototype.getCachedContextsIdx = function () {
        return this._contexts;
    };

    /**
     * Provides information about version of EntryStore repository, the javascript API,
     * status of services etc.
     * @todo Needs support from EntryStore REST API
     * @todo Document promise
     * @returns {dojo/promise/Promise}
     */
    EntryStore.prototype.info = function () {
        require(["dojo/text!package.json"], function(data) {
            var p = json.parse(data);
            return {version: p.version};
        })
    };

    EntryStore.prototype.getFactory = function() {
        return factory;
    }

    return EntryStore;
});

/**
 * @name userInfoPromise
 * @extends xhrPromise
 * @class
 */
/**
 * @name userInfoPromise#then
 * @param {userInfoCallback} onSuccess
 * @param {xhrFailureCallback} onError
 */
/**
 * @callback userInfoCallback
 * @param {userInfo} resource
 */
/**
 * @name userInfo
 * @namespace
 * @property {string}  user                   - the username
 * @property {string}  id                     - the entry id of the users entry
 * @property {string}  homecontext            - the entry id of the users home context.
 */


/**
 * @name entryArrayPromise
 * @extends xhrPromise
 * @class
 */
/**
 * @name entryArrayPromise#then
 * @param {entryArrayCallback} onSuccess provides an array of Entries
 * @param {xhrFailureCallback} onError
 */
/**
 * @callback entryArrayCallback
 * @param {store/Entry[]} arr
 */
