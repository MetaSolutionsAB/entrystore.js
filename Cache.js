/*global define*/
define([], function() {

    /**
     * Caches loaded entries and keeps track of which entries that need to be updated (refreshed).
     * The cache also provides a listener functionality that allows you to be notified of
     * when entries are updated.
     *
     * @exports store/Cache
     * @class
     */
	var Cache = function() {
		this._listenerCounter = 0;
		this._listenersIdx = {};
		this._cacheIdx = {};
		this._cacheIdxResource = {};
        this._cacheCtrl = {};
	};

    /**
     * Add or update the entry to the cache.
     * All listeners will be notified unless silently is specified.
     *
     * @param {store/Entry} entry
     * @param {Boolean=} silently - listeners will be notified unless true is specified.
     */
	Cache.prototype.cache = function(entry, silently) {
		var previouslyCached = this._cacheIdx[entry.getURI()] != null;
		this._cacheIdx[entry.getURI()] = entry;
        var resArr = this._cacheIdxResource[entry.getResourceURI()];
        if (typeof resArr === "undefined") {
            resArr = [];
            this._cacheIdxResource[entry.getResourceURI()] = resArr;
        }
		if (resArr.indexOf(entry) === -1) {
			resArr.push(entry);
		}
        this._cacheCtrl[entry.getURI()] = {date: new Date().getTime()};
		if (previouslyCached && silently !== true) {
			this.messageListeners("refreshed", entry);
		}
	};

	/**
	 * Removes a single entry from the cache.
	 * @param {store/Entry} entry the entry to remove.
     */
	Cache.prototype.unCache = function(entry) {
		delete this._cacheIdx[entry.getURI()];
		var resArr = this._cacheIdxResource[entry.getResourceURI()];
		if (typeof resArr !== "undefined") {
			for (var i = 0; i<resArr.length;i++) {
				if (resArr[i].getURI() === entry.getURI()) {
					resArr.splice(i, 1);
				}
				if (resArr.length === 0) {
					delete this._cacheIdxResource[entry.getResourceURI()];
				}
			}
		}
	};

    /**
     * Marks an entry as in need of refresh from the store.
     * All listeners are notified of the entry now being in need of refreshing unless
     * silently is set to true.
     *
     * @param {store/Entry} entry
     * @param {Boolean=} silently
     */
	Cache.prototype.setRefreshNeeded = function(entry, silently) {
        var ctrl = this._cacheCtrl[entry.getURI()];
        if (ctrl == null) {
            throw "No cache control of existing entry: "+entry.getURI();
        }
        ctrl.stale = true;
		if (silently !== true) {
			this.messageListeners("needRefresh", entry);
		}
	};

    /**
     * A convenience method for caching multiple entries.
     *
     * @param {store/Entry[]} entryArr
     * @param {Boolean=} silently
     * @see store/Cache#cache
     */
    Cache.prototype.cacheAll = function(entryArr, silently) {
		for (var i=0; i<entryArr.length;i++) {
			this.cache(entryArr[i], silently);
		}
	};

    /**
     * Retrieve the entry from it's URI.
     *
     * @param {String} entryURI
     * @returns {store/Entry|undefined}
     */
    Cache.prototype.get = function(entryURI) {
		return this._cacheIdx[entryURI];
	};


    /**
     * Retrieve all entries that have the specified uri as resource.
     * Note that since several entries (e.g. links) may have the same uri
     * as resource this method returns an array. However, in many situations
     * there will be zero or one entry per uri.
     *
     * @param {String} resourceURI
     * @returns {store/Entry[]} always returns an array, may be empty though.
     */
    Cache.prototype.getByResourceURI = function(uri) {
        var arr = this._cacheIdxResource[uri];
        if (typeof arr !== "undefined" && typeof arr.slice === "function") {
            return arr.slice(0);
        }
        return [];
    };

    /**
     * Tells wheter the entry is in need of a refresh from the repository.
     *
     * @param {store/Entry} entry
     * @returns {boolean}
     */
	Cache.prototype.needRefresh = function(entry) {
        var ctrl = this._cacheCtrl[entry.getURI()];
        if (ctrl == null) {
            throw "No cache control of existing entry: "+entry.getURI();
        }
		return ctrl.stale === true;
	};

    /**
     * @param {Function} listener
     */
	Cache.prototype.addCacheUpdateListener = function(listener) {
		if (listener.__clid != null) {
			listener.__clid = "idx_"+this._listenerCounter;
			this._listenerCounter++;
		}
		this._listenersIdx[listener.__clid] = listener;
	};

    /**
     * @param {Function} listener
     */
	Cache.prototype.removeCacheUpdateListener = function(listener) {
		if (listener.__clid != null) {
			delete this._listenersIdx[listener.__clid];
		}
	};

    /**
     * Agreed topics are:
     * allEntriesNeedRefresh - all entries are now in need of refresh, typically happens after a change of user(sign in)
     * needRefresh - the specified entry need to be refreshed.
     * refreshed - the specified entry have been refreshed.
     *
     * @param {String} topic
     * @param {store/Entry=} affectedEntry
     */
	Cache.prototype.messageListeners = function(topic, affectedEntry) {
		for (var clid in this._listenersIdx) {
			if (this._listenersIdx.hasOwnProperty(clid)) {
				this._listenersIdx[clid](topic, affectedEntry);
			}
		}
	};

    /**
     * Marks all entries as in need of refresh and consequently messages all listeners with the allEntriesNeedRefresh topic.
     */
	Cache.prototype.allNeedRefresh = function() {
		for (var uri in this._cacheIdx) {
			if (this._cacheIdx.hasOwnProperty(uri)) {
				this.setRefreshNeeded(this._cacheIdx[uri], true); //Do not messageListeners for every entry.
			}
		}
		this.messageListeners("allEntriesNeedRefresh");
	};

	/**
	 * Clears the cache from all cached entries.
	 * Warning: all references to entries needs to be discarded as they will not be
	 * kept in sync with changes.
	 */
	Cache.prototype.clear = function() {
		this._cacheIdx = {};
		this._cacheIdxResource = {};
		this._cacheCtrl = {};
	};

	return Cache;
});