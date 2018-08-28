  /**
   * Caches loaded entries and keeps track of which entries that need to be updated (refreshed).
   * The cache also provides a listener functionality that allows you to be notified of
   * when entries are updated.
   *
   * @exports store/Cache
   */
  const Cache = class {
    constructor() {
      this._listenerCounter = 0;
      this._listenersIdx = {};
      this._cacheIdx = {};
      this._cacheIdxResource = {};
      this._cacheCtrl = {};
    }

    /**
     * Add or update the entry to the cache.
     * All listeners will be notified unless silently is specified.
     *
     * @param {store/Entry} entry
     * @param {Boolean=} silently - listeners will be notified unless true is specified.
     */
    cache(entry, silently) {
      const previouslyCached = this._cacheIdx[entry.getURI()] != null;
      this._cacheIdx[entry.getURI()] = entry;
      let resArr = this._cacheIdxResource[entry.getResourceURI()];
      if (typeof resArr === 'undefined') {
        resArr = [];
        this._cacheIdxResource[entry.getResourceURI()] = resArr;
      }
      if (resArr.indexOf(entry) === -1) {
        resArr.push(entry);
      }
      this._cacheCtrl[entry.getURI()] = { date: new Date().getTime() };
      if (previouslyCached && silently !== true) {
        this.messageListeners('refreshed', entry);
      }
    }

    /**
     * Removes a single entry from the cache.
     * @param {store/Entry} entry the entry to remove.
     */
    unCache(entry) {
      delete this._cacheIdx[entry.getURI()];
      const resArr = this._cacheIdxResource[entry.getResourceURI()];
      if (typeof resArr !== 'undefined') {
        for (let i = 0; i < resArr.length; i++) {
          if (resArr[i].getURI() === entry.getURI()) {
            resArr.splice(i, 1);
          }
          if (resArr.length === 0) {
            delete this._cacheIdxResource[entry.getResourceURI()];
          }
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
      const ctrl = this._cacheCtrl[entry.getURI()];
      if (ctrl == null) {
        throw new Error(`No cache control of existing entry: ${entry.getURI()}`);
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
      for (let i = 0; i < entryArr.length; i++) {
        this.cache(entryArr[i], silently);
      }
    }

    /**
     * Retrieve the entry from it's URI.
     *
     * @param {String} entryURI
     * @returns {store/Entry|undefined}
     */
    get(entryURI) {
      return this._cacheIdx[entryURI];
    }

    /**
     * Retrieve all entries that have the specified uri as resource.
     * Note that since several entries (e.g. links) may have the same uri
     * as resource this method returns an array. However, in many situations
     * there will be zero or one entry per uri.
     *
     * @param {String} resourceURI
     * @returns {store/Entry[]} always returns an array, may be empty though.
     */
    getByResourceURI(uri) {
      const arr = this._cacheIdxResource[uri];
      if (typeof arr !== 'undefined' && typeof arr.slice === 'function') {
        return arr.slice(0);
      }
      return [];
    }

    /**
     * Tells wheter the entry is in need of a refresh from the repository.
     *
     * @param {store/Entry} entry
     * @returns {boolean}
     */
    needRefresh(entry) {
      const ctrl = this._cacheCtrl[entry.getURI()];
      if (ctrl == null) {
        throw new Error(`No cache control of existing entry: ${entry.getURI()}`);
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
      this._listenersIdx[listener.__clid] = listener;
    }

    /**
     * @param {Function} listener
     */
    removeCacheUpdateListener(listener) {
      if (listener.__clid != null) {
        delete this._listenersIdx[listener.__clid];
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
      Object.keys(this._listenersIdx).forEach((clid) => {
        this._listenersIdx[clid](topic, affectedEntry);
      });
    }

    /**
     * Marks all entries as in need of refresh and consequently messages all listeners
     * with the allEntriesNeedRefresh topic.
     */
    allNeedRefresh() {
      Object.keys(this._cacheIdx).forEach((uri) => {
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
      this._cacheIdx = {};
      this._cacheIdxResource = {};
      this._cacheCtrl = {};
    }
  };

  export { Cache };
