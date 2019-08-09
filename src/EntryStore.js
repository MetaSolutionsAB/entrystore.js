import Auth from './Auth';
import Cache from './Cache';
import factory from './factory';
import PrototypeEntry from './PrototypeEntry';
import Resource from './Resource';
import Rest from './Rest';
import SolrQuery from './SolrQuery';
import types from './types';
import User from './User';
import { isBrowser } from './utils';

const he = require('he'); // TODO @scazan: Remove when echoFile is changed by @Hannes

/**
 * EntryStore is the main class that is used to connect to a running server-side EntryStore
 * repository.
 * @exports store/EntryStore
 */
export default class EntryStore {
  /**
   * @param {String=} baseURI - URL to the EntryStore repository we should communicate with,
   * may be left out and
   * guessed if run in a browser environment (appends "/store/" to the window.location.origin)
   * @param {Object=} credentials - same as provided in the {@link store/EntryStore#auth auth}
   * method.
   */
  constructor(baseURI, credentials) {
    if (isBrowser() && baseURI == null) {
      this._baseURI = `${window.location.origin}/store/`;
    } else {
      this._baseURI = baseURI;
      if (this._baseURI[this._baseURI.length - 1] !== '/') {
        this._baseURI = `${this._baseURI}/`;
      }
    }

    this._cache = new Cache();
    this._auth = new Auth(this);
    if (credentials) {
      this._auth.login(...credentials);
    }
    this._contexts = {};
    this._rest = new Rest();
  }

  /**
   * Provides a listener that will be called for every asynchronous call being made.
   * The handler is invoked with the promise from the asynchronous call
   * and a callType parameter indicating which asynchronous call that has been made.
   *
   * The callType parameter can take the following values:
   * - getEntry        - an entry is retrieved (EntryStore.getEntry)
   * - createEntry     - an entry is created   (EntryStore.createEntry)
   * - createGroupAndContext - a group and context pair is created
   * (EntryStore.createGroupAndContext)
   * - loadViaProxy    - data is requested via repository proxy (EntryStore.loadViaProxy)
   * - commitMetadata  - changes to metadata is pushed (Entry.commitMetadata)
   * - commitCachedExternalMetadata - changes to cached external metadata is pushed
   * (Entry.commitCachedExternalMetadata)
   * - getResource     - the entry's resource has been requested (Entry.getResource)
   * - getLinkedEntry  - a linked entry is requested (Entry.getLinkedEntry)
   * - delEntry        - an entry is deleted (Entry.del)
   * - refresh         - an entry is refreshed (Entry.refresh)
   * - setContextName  - the name of a context is changed (Context.setName)
   * - getUserInfo     - the user information is requested (auth.getUserInfo)
   * - getUserEntry    - the user entry is requested (auth.getUserEntry)
   * - login           - logging in (auth.login)
   * - logout          - logging out (auth.logout)
   * - commitEntryInfo - pushing changes in entry information (EntryInfo.commit)
   * - getFile         - the contents of a file resource is requested (File.get*)
   * - putFile         - the contents of a file is pushed (File.put*)
   * - commitGraph     - a graph resource is pushed (Graph.commit)
   * - commitString    - a string resource is pushed (String.commit)
   * - setGroupName    - a new name of a group is pushed (Group.setName)
   * - setUserName     - a new name of a user is pushed (User.setName)
   * - setUserDisabled - a new disabled state of a user is pushed (User.setDisabled)
   * - setUserLanguage - a new preferred language of the user is pushed (User.setLanguage)
   * - setUserPassword - a new password for the user is pushed (User.setPassword)
   * - setUserHomeContext - a new home context for the user is pushed (User.setHomeContext)
   * - setUserCustomProperties - new custom properties for the user (User.setCustomProperties)
   * - loadListEntries - members of a list are requested (List.getEntries)
   * - setList         - the list members are changed via a list
   * - addToList       - See List.addEntry
   * - removeFromList  - See List.removeEntry
   * .removeEntry)
   * - search          - a search is being performed (SearchList.getEntries)
   * - execute         - a pipeline is executed (Pipeline.execute)
   *
   * @param {Promise.<string>} listener
   */
  addAsyncListener(listener) {
    if (this.asyncListeners) {
      this.asyncListeners.push(listener);
    } else {
      this.asyncListeners = [listener];
    }
  }

  /**
   * Removes a previously added listener for asynchronous calls.
   * @param {string} listener
   */
  removeAsyncListener(listener) {
    if (this.asyncListeners) {
      this.asyncListeners.splice(this.asyncListeners.indexOf(listener), 1);
    }
  }

  /**
   *
   * @param {Promise} promise
   * @param {string} context
   * @return {Promise}
   */
  handleAsync(promise, context) {
    if (this.asyncListeners) {
      for (let i = 0; i < this.asyncListeners.length; i++) {
        this.asyncListeners[i](promise, context);
      }
    }

    return promise;
  }

  /**
   * @returns {store/Auth} where functionality related to authorization are located,
   * including a listener infrastructure.
   */
  getAuth() {
    return this._auth;
  }

  /**
   * Yields information about who currently is authenticated against the EntryStore repository.
   * @returns {Promise.<store/EntryInfo>} - upon success an object containing attributes "user" being
   * the username, "id" of the user entry, and "homecontext" being the entry-id of the
   * home context is provided.
   * @see {@link store/EntryStore#auth auth}
   * @see {@link store/EntryStore#logout logout}
   * @deprecated use corresponding method on auth object instead.
   */
  getUserInfo() {
    return this._auth.getUserInfo();
  }

  /**
   * @returns {Promise.<store/Entry>} on success the entry for the currently signed in user is provided.
   * @deprecated use corresponding method on auth object instead.
   */
  getUserEntry() {
    return this._auth.getUserEntry();
  }

  /**
   * Authenticate using credentials containing a user, a password and an optional maxAge given
   * in seconds.
   *
   * @param {{user, password, maxAge}} credentials as a parameter object
   * @deprecated use corresponding method on auth object instead.
   */
  auth(credentials) {
    if (credentials == null) {
      return this._auth.logout();
    }
    return this._auth.login(credentials.user, credentials.password, credentials.maxAge);
  }

  /**
   * Logout the currently authorized user.
   * @returns {Promise}
   * @deprecated use corresponding method on auth object instead.
   */
  logout() {
    return this._auth.logout();
  }

  /**
   * Fetches an entry given an entryURI. If the entry is already loaded and available in the
   * cache it will be returned directly, otherwise it will be loaded from the repository.
   * If the entry is already loaded but marked as in need of a refresh it will be refreshed
   * first.
   *
   * The optional load parameters are provided in a single parameter object with six possible
   * attributes. Below we outline these attributes, the first two (forceLoad and direct) applies
   * to all kind of entries while the following three (limit, offset and sort) only applies if
   * the entry is a list:
   *
   * forceLoad - ignores if the entry is already in cache and fetches from the repository
   * loadResource - makes sure that entry.getResource(true) will not return null
   *     (does not work in combination with direct).
   * direct - returns the entry from the cache directly rather than returning a promise,
   *    if the entry is not in the cache an undefined value will be returned.
   * limit - only a limited number of children are loaded, -1 means no limit, 0, undefined
   *    or if the attribute is not provided means that the default limit of 20 is used.
   * offset - only children from offest and forward is returned, must be positive.
   * sort - information on how to sort the children:
   *     * if sort is not provided at all or an empty object is provided the members of the
   *       list will not be sorted, instead the list's natural order will be used
   *     * if sort is given as null the defaults will be used ({sortBy: "title", prio: "List"}).
   *     * if sort is given as a non emtpy object the following attributes are considered:
   *       ** sortBy - the attribute instructs which metadata field to sort the children by,
   *          i.e., title, created, modified, or size.
   *       ** lang - if sort is title and the title is provided in several languages a
   *          prioritized language can be given.
   *       ** prio - allows specific graphtypes to be prioritized
   *          (e.g. show up in the top of the list).
   *       ** descending - if true the children are shown in descending order.
   *
   *
   * **Note** - in the case where the entry is a list it is possible to change the limit,
   * offset and sort later by calling the corresponding methods on the {@link store/List}
   * resource, e.g. {@link store/List#setSort}. However, setting the values already in this
   * method call has as a consequence that one less request to the repository is made as you
   * will get members (in the right amount and order) in the same request as you get metadata
   * and other information.
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
   * The optional params here says that we force a load from the repository, that we want the
   * results to be paginated with a limit of 10 entries per page and that we want page 3.
   * We also indicate that we want the list to be sorted by latest modification date and that
   * if there are member entries that are lists they should be sorted to the top.
   *
   * @param {string} entryURI - the entryURI for the entry to retrieve.
   * @param {{forceLoad, direct, loadResource, limit, offset, sort, asyncContext}} optionalLoadParams - parameters for how to load an entry.
   * @return {Promise.<store/Entry> | store/Entry | undefined} - by default a promise is returned,
   * if the direct parameter is specified the entry is returned directly or undefined if the
   * entry is not in cache.
   * @see {@link store/EntryStore#getEntryURI getEntryURI} for help to construct entry URIs.
   * @see {@link store/Context#getEntryById} for loading entries relative to a context.
   */
  getEntry(entryURI, optionalLoadParams = {}) {
    const forceLoad = optionalLoadParams ? optionalLoadParams.forceLoad === true : false;
    const e = this._cache.get(entryURI);
    let asyncContext = 'getEntry';
    if (optionalLoadParams != null) {
      if (optionalLoadParams.asyncContext) {
        asyncContext = optionalLoadParams.asyncContext;
      }
      if (optionalLoadParams.direct === true) {
        return e;
      }
    }
    const checkResourceLoaded = (entry) => {
      if (optionalLoadParams != null && optionalLoadParams.loadResource
        && entry.getResource() == null) {
        return entry.getResource().then(() => entry);
      }
      return entry;
    };
    if (e && !forceLoad) {
      if ((e.isList() || e.isGroup()) && optionalLoadParams != null) {
        const list = e.getResource(true); // Direct access works for lists and groups.
        list.setLimit(optionalLoadParams.limit);
        list.setSort(optionalLoadParams.sort);
      }

      // Will only refresh if needed, a promise is returned in any case
      return this.handleAsync(e.refresh().then(checkResourceLoaded), asyncContext);
    }
    const self = this;
    const entryLoadURI = factory.getEntryLoadURI(entryURI, optionalLoadParams);
    return this.handleAsync(this._rest.get(entryLoadURI).then((data) => {
      // The entry, will always be there.
      const entry = factory.updateOrCreate(entryURI, data, self);
      return checkResourceLoaded(entry);
    }, (err) => {
      throw new Error(`Failed fetching entry. ${err}`);
    }), asyncContext);
  }

  /**
   * Retrieves entries from a list. One way to see it is that this is a convenience method
   * that retrieves a list entry, its member entries and returns those in an array.
   *
   * @param {string} entryURI - URI of the list entry to load entries from.
   * @param {Object} sort - same sort object as provided in the optionalLoadParams to
   * {@see store/EntryStore#getEntry getEntry} method.
   * @param {Object} limit - same limit as provided in the optionalLoadParams to
   * {@see store/EntryStore#getEntry getEntry} method.
   * @param {integer} page - unless limit is set to -1 (no pagination) we need to specify which
   * page to load, first page is 0.
   * @returns {Promise.<store/Entry[]>} upon success the promise returns an array of entries.
   */
  getListEntries(entryURI, sort, limit, page) {
    return new Promise((resolve, reject) => {
      const op = {};
      if (sort != null) {
        op.sort = sort;
      }
      if (limit % 1 === 0) {
        op.limit = limit;
      }
      if (page % 1 === 0) {
        if (limit % 1 === 0) {
          op.offset = limit * page;
        } else {
          op.offset = factory.getDefaultLimit() * page;
        }
      }
      this.getEntryStore().getEntry(entryURI, op)
        .then((entry) => {
          const list = entry.getResource(true);
          list.getEntries(page).then(resolve, reject);
        }, reject);
    });
  }

  /**
   * Retrieves a Context instance via its id. Note that this method returns directly without
   * checking with the EntryStore repository that the context exists. Hence successive
   * operations via this context instance may fail if the context does not exist in the
   * EntryStore
   * repository.
   *
   * Note that in EntryStore everything is connected to entries. Hence a context is nothing else
   * than a special kind of resource maintained by an entry. This entry provides metadata about
   * the context as well as the default ownership and access control that applies to all entries
   * inside of this context.
   *
   * To get a hold of the contexts own entry use the {@link store/Resource#getEntry}
   * method on the context (inherited from the generic {@link store/Resource} class.
   *
   * Advanced: Entrys corresponding to contexts are stored in the special _contexts
   * context which, since it is a context, contains its own entry.
   *
   * @param {string} contextId - identifier for the context (not necessarily the same as the
   * alias/name for the context)
   * @return {store/Context}
   */
  getContextById(contextId) {
    return factory.getContext(this, `${this._baseURI}_contexts/entry/${contextId}`);
  }

  /**
   * Retrieves a Context instance via its entry's URI.
   *
   * @param {String} contextEntryURI - URI to the context's entry, e.g. base/_contexts/entry/1.
   * @returns {store/Context}
   * @see {@link store/EntryStore#getContextById getContextById}
   */
  getContext(contextEntryURI) {
    return factory.getContext(this, contextEntryURI);
  }

  /**
   * Retrieves a paginated list of all contexts in the EntryStore repository.
   * @return {store/List} - the list contains entries which have contexts as resources.
   */
  getContextList() {
    return this.newSolrQuery().graphType(types.GT_CONTEXT).list();
  }

  /**
   * Retrieves a paginated list of all users and groups in the EntryStore repository
   * @return {store/List} the list contains entries that have principals as resources.
   * @todo May include folders and other entries as well...
   */
  getPrincipalList() {
    return this.newSolrQuery().graphType([types.GT_USER, types.GT_GROUP]).list();
  }

  /**
   * Creates a new entry according to information in the provided {@link store/PrototypeEntry}.
   * The information specifies the type of entry, which context it should reside in,
   * initial metadata etc. This method is seldom called explicitly, instead it is called
   * indirectly via the {@link store/PrototypeEntry#commit} method. E.g.:
   *
   *     context.newEntry().commit().then(function(newlyCreatedEntry) {...}
   *
   * @param {store/PrototypeEntry} prototypeEntry - information about the entry to create.
   * @return {Promise}
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
  async createEntry(prototypeEntry) {
    const postURI = factory.getEntryCreateURI(prototypeEntry, prototypeEntry.getParentList());
    const postParams = factory.getEntryCreatePostData(prototypeEntry);
    let entryURI;
    try {
      entryURI = await this.handleAsync(this._rest.create(postURI, postParams), 'createEntry');
    } catch (err) {
      console.error(err);
      return;
    }

    // var euri = factory.getURIFromCreated(data, prototypeEntry.getContext());
    const parentList = prototypeEntry.getParentList();
    if (parentList != null) {
      const res = parentList.getResource(true);
      if (res != null && res.needRefresh) {
        parentList.getResource(true).needRefresh();
      }
    }
    return this.getEntry(entryURI);
  }

  /**
   * Provides a PrototypeEntry for creating a new context.
   * @param {string=} contextName - optional name for the context, can be changed later,
   * must be unique in the _principals context
   * @param {string=} id - optional requested identifier (entryId) for the context,
   * cannot be changed later, must be unique in the _principals context
   * @returns {store/PrototypeEntry}
   */
  newContext(contextName, id) {
    const _contexts = factory.getContext(this, `${this._baseURI}_contexts/entry/_contexts`);
    const prototypeEntry = new PrototypeEntry(_contexts, id).setGraphType(types.GT_CONTEXT);
    if (contextName != null) {
      const ei = prototypeEntry.getEntryInfo();
      const resource = new Resource(ei.getEntryURI(), ei.getResourceURI(), this);
      resource._update({ name: contextName });
      prototypeEntry._resource = resource;
    }
    return prototypeEntry;
  }

  /**
   *
   * @param name
   * @return {Promise.<store/Entry>}
   * @async
   */
  async createGroupAndContext(name) {
    let uri = `${this._baseURI}_principals/groups`;
    if (name != null) {
      uri += `?name=${encodeURIComponent(name)}`;
    }
    const location = await this.handleAsync(this._rest.create(uri), 'createGroupAndContext');
    return this.getEntry(location);
  }

  /**
   * Provides a PrototypeEntry for creating a new user.
   * @param {string=} username - the name the user will use to authenticate himself
   * @param {string=} password - the password the user will use to authenticate himself
   * @param {string=} homeContext - a specific context the user will consider his own home
   * @param {string=} id - requested identifier for the user
   * @returns {store/PrototypeEntry}
   */
  newUser(username, password, homeContext, id) {
    const _principals = factory.getContext(this, `${this._baseURI}_contexts/entry/_principals`);
    const prototypeEntry = new PrototypeEntry(_principals, id).setGraphType(types.GT_USER);
    const entryInfo = prototypeEntry.getEntryInfo();
    const data = {};
    if (username != null) {
      data.name = username;
    }
    if (password != null) {
      data.password = password;
    }
    if (homeContext != null) {
      data.homecontext = homeContext;
    }
    prototypeEntry._resource = new User(entryInfo.getEntryURI(), entryInfo.getResourceURI(), this, data);
    return prototypeEntry;
  }

  /**
   * @param {string=} groupName - optional name for the group, can be changed later,
   * must be unique in the _principals context
   * @param {string=} id - optional requested identifier (entryId) for the group,
   * cannot be changed later, must be unique in the _principals context
   * @returns {store/PrototypeEntry}
   */
  newGroup(groupName, id) {
    const _principals = factory.getContext(this, `${this._baseURI}_contexts/entry/_principals`);
    const prototypeEntry = new PrototypeEntry(_principals, id).setGraphType(types.GT_GROUP);
    if (groupName != null) {
      const ei = prototypeEntry.getEntryInfo();
      const resource = new Resource(ei.getEntryURI(), ei.getResourceURI(), this);
      resource._update({ name: groupName });
      prototypeEntry._resource = resource;
    }
    return prototypeEntry;
  }

  /**
   * Move an entry from one list to another.
   *
   * @param {store/Entry} entry - entry to move
   * @param {store/Entry} fromList - source list where the entry is currently residing.
   * @param {store/Entry} toList - destination list where the entry is supposed to end up.
   * @returns {Promise}
   */
  moveEntry(entry, fromList, toList) {
    const uri = factory.getMoveURI(entry, fromList, toList, this._baseURI);
    return this.handleAsync(this.getREST().post(uri, ''), 'moveEntry');
  }

  /**
   * Loads data via the EntryStore repository's own proxy.
   *
   * @param {string} uri indicates the resource to load.
   * @param {string} formatHint indicates that you want data back in the format specified
   * (e.g. by specifiying a suitable accept header).
   * @returns {Promise}
   */
  loadViaProxy(uri, formatHint) {
    const url = factory.getProxyURI(this._baseURI, uri);
    return this.handleAsync(this.getREST().get(url, formatHint, true), 'loadViaProxy');
  }

  /**
   * Pushes a file to the server and gets the result back immediately.
   * Since browser environments cannot access the local filesystem, the only way to get the
   * contents of a file is to "upload" it and get the contents back from the server.
   * EntryStore provides the "echo" resource to provide this workaround.
   *
   * In a browser environment a file is represented via an input element which references
   * the file to be uploaded via its value attribute. E.g.:
   *
   *       <input type="file" name="uploadFile"/>
   *
   * During the uploading process the input tag will be moved temporarily in the DOM tree,
   * it will be restored to its original position afterwards (both upon success and failure).
   *
   * @param {node} data - input element corresponding to the file to upload (echo).
   * @returns {xhrPromise}
   */
  echoFile(data) {
    // noinspection AmdModulesDependencies
    if (!(data instanceof Node)) {
      throw new Error('Argument needs to be an input element.');
    }
    if (data.name == null || data.name === '') {
      throw new Error('Failure, cannot upload resource from input element unless a name' +
        ' attribute is provided.');
    }

    // TODO EntryStore should return the actual response without HTML wrapping
    return this.handleAsync(this.getREST().putFile(`${this.getBaseURI()}echo`, data, 'text')
      .then((rawData) => {
        const response = rawData.text;
        if (response) {
          const idx = response.indexOf('\n'); // this checks if
          const status = parseInt(response.substr(0, idx).split(':')[1], 10);
          if (status !== 200) {
            const err = new Error(`HTTP status code: ${status}`);
            err.status = status;
            throw err;
          }

          const textAreaValue = response.substr(idx + 1).replace('</textarea>', ''); // TODO remove when EntryStore is fixed

          return he.decode(textAreaValue);
        }

        return response; // empty
      }), 'echoFile');
  }

  /**
   * Performing searches against an EntryStore repository is achieved by creating a
   * {@link store/SearchList} which is similar to a regular {@link store/List}.
   * From this list it is possible to get paginated results in form of matching entries.
   * For example:
   *
   *     var personType = "http://xmlns.com/foaf/0.1/Person";
   *     var searchList = entrystore.newSolrQuery().rdfType(personType).list();
   *     searchList.setLimit(20).getEntries().then(function(results) {...});
   *
   * @returns {store/SolrQuery}
   */
  newSolrQuery() {
    return new SolrQuery(this);
  }

  /**
   * @deprecated use {@link #newSolrQuery} instead.
   */
  createSearchList(query) {
    return factory.createSearchList(this, query);
  }

  /**
   * Constructs an metadata URI from the id for the context and the specific entry.
   * @param {string} contextId - an identifier for the context the entry belongs to
   * @param {string} entryId - an identifier for the entry
   * @returns {String} - an entry URI
   */
  getMetadataURI(contextId, entryId) {
    return factory.getMetadataURI(this, contextId, entryId);
  }

  /**
   * Constructs an entry URI from the id for the context and the specific entry.
   * @param {string} contextId - an identifier for the context the entry belongs to
   * @param {string} entryId - an identifier for the entry
   * @returns {String} - an entry URI
   */
  getEntryURI(contextId, entryId) {
    return factory.getEntryURI(this, contextId, entryId);
  }

  /**
   * Constructs an entry URI from a normal repository URI, e.g. any URI from which is possible
   * to deduce a contextId and an entryId. Equivalent to calling:
   * es.getEntryURI(es.getContextId(uri), es.getEntryId(uri))
   *
   * @param {string} uri - a URI for the entry, can be a entryURI (obviously), resourceURI
   * (if local), metadataURI, or relationsURI.
   * @returns {String} - an entry URI
   */
  getEntryURIFromURI(uri) {
    return factory.getEntryURIFromURI(this, uri);
  }

  /**
   * Constructs an entry resource URI (local URI, not a link obviously) from the id for the
   * context and the specific entry.
   *
   * @param {string} contextId - an identifier for the context the resource belongs to
   * @param {string} entryId - an identifier for the entry the resource belongs to
   * @returns {String} a resource URI
   */
  getResourceURI(contextId, entryId) {
    return factory.getResourceURI(this, contextId, entryId);
  }

  /**
   * The base URI of the EntryStore repository we have connected to.
   *
   * @returns {String}
   */
  getBaseURI() {
    return this._baseURI;
  }

  /**
   * The entry id of this entry, resource or metadata uri.
   *
   * @param {string} uri
   * @returns {string}
   */
  getEntryId(uri) {
    return factory.getEntryId(uri, this.getBaseURI());
  }

  /**
   * The context id of this entry, resource or metadata uri.
   *
   * @param {string} uri
   * @returns {string}
   */
  getContextId(uri) {
    return factory.getContextId(uri, this.getBaseURI());
  }

  /**
   *  To get status resource
   *
   * @returns {Promise}
   */
  getStatus() {
    const uri = `${this._baseURI}management/status?extended`;
    return this.handleAsync(this.getREST().get(uri));
  }

  /**
   * The cache where all entries are cached after loading.
   *
   * @returns {store/Cache}
   */
  getCache() {
    return this._cache;
  }

  /**
   * The loading mechanism are performed via REST calls, this REST module can be
   * used for doing manual lookups outside of the scope of this API.
   *
   * @returns {store/Rest}
   */
  getREST() {
    return this._rest;
  }

  //= =============Non-public methods==============

  /**
   * @returns {Object}
   */
  getCachedContextsIdx() {
    return this._contexts;
  }

  /**
   * Provides information about version of EntryStore repository, the javascript API,
   * status of services etc.
   * @todo Needs support from EntryStore REST API
   * @todo Document promise
   */
  static info() {
    const packageJSON = require('../package.json');
    return { version: packageJSON.version };
  }
};
