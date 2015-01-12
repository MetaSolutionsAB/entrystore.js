/*global define*/
define([], function() {

    /**
     * @exports store/Cache
     * @class
     */
	var Cache = function() {
		this._listenerCounter = 0;
		this._listenersIdx = {};
		this._cacheIdx = {};
        this._cacheCtrl = {};
	};

    /**
     * Add or update the entry to the cache.
     * All listeners will be notified unless silently is specified.
     *
     * @param {store.Entry} entry
     * @param {Boolean=} silently
     */
	Cache.prototype.cache = function(entry, silently) {
		var previouslyCached = this._cacheIdx[entry.getURI()] != null;
		this._cacheIdx[entry.getURI()] = entry;
        this._cacheCtrl[entry.getURI()] = {date: new Date().getTime()};
		if (previouslyCached && silently !== true) {
			this.messageListeners("refreshed", entry);
		}
	};

    /**
     * Marks an entry as in need of refresh from the store.
     * All listeners are notified of the entry now being in need of refreshing unless
     * silently is set to true.
     *
     * @param {store.Entry} entry
     * @param {Boolean} silently
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
     * @param {Array.<store.Entry>} entryArr
     * @param {Boolean=} silently
     * @see store.Cache#cache
     */
    Cache.prototype.cacheAll = function(entryArr, silently) {
		for (var i=0; i<entryArr.length;i++) {
			this.cache(entryArr[i], silently);
		}
	};
    /**
     * @param {String} entryURI
     * @returns {store.Entry|undefined}
     */
    Cache.prototype.get = function(entryURI) {
		return this._cacheIdx[entryURI];
	};
    /**
     *
     * @param {store.Entry} entry
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
     * @param {store.Entry=} affectedEntry
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

	return Cache;
});