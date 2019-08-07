/**
 * Caches loaded entries and keeps track of which entries that need to be updated (refreshed).
 * The cache also provides a listener functionality that allows you to be notified of
 * when entries are updated.
 *
 * @exports store/Cache
 */
export default class Cache {
  constructor() {
    /**
     * @type {Map<string, Function>}
     * @private
     */
    this._listenersIdx = new Map();

    /**
     * @type {Map<string, store/Entry>}
     * @private
     */
    this._cacheIdx = new Map();

    /**
     * @type {Map<string, Set<store/Entry>>}
     * @private
     */
    this._cacheIdxResource = new Map();

    /**
     * @type {Map<string, object>}
     * @private
     */
    this._cacheCtrl = new Map();

    this._listenerCounter = 0;
  }

  /**
   * Add or update the entry to the cache.
   * All listeners will be notified unless silently is specified.
   *
   * @param {store/Entry} entry
   * @param {Boolean=} silently - listeners will be notified unless true is specified.
   */
  cache(entry, silently) {
    const entryURI = entry.getURI();
    const previouslyCached = this._cacheIdx.has(entryURI);

    this._cacheIdx.set(entryURI, entry);

    const entryRURI = entry.getResourceURI();
    const entriesSet = this._cacheIdxResource.has(entryRURI) ? this._cacheIdxResource.get(entryRURI) : new Set();

    if (!entriesSet.has(entry)) {
      entriesSet.add(entry);
    }

    this._cacheIdxResource.set(entryRURI, entriesSet);

    this._cacheCtrl.set(entryURI, {
      date: new Date().getTime(),
    });

    if (previouslyCached && silently !== true) {
      this.messageListeners('refreshed', entry);
    }
  }

  /**
   * Removes a single entry from the cache.
   * @param {store/Entry} entry the entry to remove.
   */
  unCache(entry) {
    const entryURI = entry.getURI();
    const entryRURI = entry.getResourceURI();

    this._cacheIdx.delete(entryURI);
    const entriesSet = this._cacheIdxResource.get(entryRURI);

    if (entriesSet.size > 0) {
      entriesSet.delete(entry);
      if (entriesSet.size === 0) {
        this._cacheIdxResource.delete(entryRURI);
      }
    }
  }

  /**
   * Marks an entry as in need of refresh from the store.
   * All listeners are notified of the entry now being in need of refreshing unless
   * silently is set to true.
   *
   * @param {store/Entry} entry
   * @param {Boolean=} silently
   */
  setRefreshNeeded(entry, silently) {
    const entryURI = entry.getURI();
    const ctrl = this._cacheCtrl.get(entryURI);
    if (ctrl == null) {
      throw new Error(`No cache control of existing entry: ${entryURI}`);
    }
    ctrl.stale = true;
    if (silently !== true) {
      this.messageListeners('needRefresh', entry);
    }
  }

  /**
   * A convenience method for caching multiple entries.
   *
   * @param {store/Entry[]} entryArr
   * @param {Boolean=} silently
   * @see store/Cache#cache
   */
  cacheAll(entryArr, silently) {
    entryArr.forEach((entry) => {
      this.cache(entry, silently);
    });
  }

  /**
   * Retrieve the entry from it's URI.
   *
   * @param {String} entryURI
   * @returns {store/Entry|undefined}
   */
  get(entryURI) {
    return this._cacheIdx.get(entryURI);
  }

  /**
   * Retrieve all entries that have the specified uri as resource.
   * Note that since several entries (e.g. links) may have the same uri
   * as resource this method returns an array. However, in many situations
   * there will be zero or one entry per uri.
   *
   * @param {String} uri
   * @returns {Set<store/Entry>} always returns a set, may be empty though.
   */
  getByResourceURI(uri) {
    return new Set(this._cacheIdxResource.get(uri));
  }

  /**
   * Tells whether the entry is in need of a refresh from the repository.
   *
   * @param {store/Entry} entry
   * @returns {boolean}
   */
  needRefresh(entry) {
    const entryURI = entry.getURI();
    const ctrl = this._cacheCtrl.get(entryURI);
    if (ctrl == null) {
      throw Error(`No cache control of existing entry: ${entryURI}`);
    }
    return ctrl.stale === true;
  }

  /**
   * @param {Function} listener
   */
  addCacheUpdateListener(listener) {
    if (listener.__clid != null) {
      listener.__clid = `idx_${this._listenerCounter}`;
      this._listenerCounter += 1;
    }
    this._listenersIdx.set(listener.__clid, listener);
  }

  /**
   * @param {Function} listener
   */
  removeCacheUpdateListener(listener) {
    if (listener.__clid != null) {
      this._listenersIdx.delete(listener.__clid);
    }
  }

  /**
   * Agreed topics are:
   * allEntriesNeedRefresh - all entries are now in need of refresh,
   * typically happens after a change of user(sign in)
   * needRefresh - the specified entry need to be refreshed.
   * refreshed - the specified entry have been refreshed.
   *
   * @param {String} topic
   * @param {store/Entry=} affectedEntry
   */
  messageListeners(topic, affectedEntry) {
    this._listenersIdx.forEach((func) => {
      func(topic, affectedEntry);
    });
  }

  /**
   * Marks all entries as in need of refresh and consequently messages all listeners
   * with the allEntriesNeedRefresh topic.
   */
  allNeedRefresh() {
    this._cacheIdx.forEach((entry, uri) => {
      // Do not messageListeners for every entry.
      this.setRefreshNeeded(this._cacheIdx[uri], true);
    });
    this.messageListeners('allEntriesNeedRefresh');
  }

  /**
   * Clears the cache from all cached entries.
   * Warning: all references to entries needs to be discarded as they will not be
   * kept in sync with changes.
   */
  clear() {
    this._cacheIdx = new Map();
    this._cacheIdxResource = new Map();
    this._cacheCtrl = new Map();
  }
}
