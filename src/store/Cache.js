/*global define*/
define([], function() {
	
	
	var Cache = function() {
		this._listenerCounter = 0;
		this._listenersIdx = {};
		this._cacheIdx = {};		
	};
	var c = Cache.prototype;
	
	c.cache = function(entry, silently) {
		var previouslyCached = this._cacheIdx[entry.getURI()] != null;
		this._cacheIdx[entry.getURI()] = entry;
		entry.__cacheDate = new Date().getTime();
		delete entry.__cacheStale;
		if (previouslyCached && silently !== true) {
			this.messageListeners("refreshed", entry);
		}
	};
	
	c.needRefresh = function(entry, silently) {
		entry.__cacheStale = true;
		if (silently !== true) {
			this.messageListeners("needRefresh", entry);
		}
	};

	c.cacheAll = function(entryArr) {
		for (var i=0; i<entryArr.length;i++) {
			this.cache(entryArr[i]);
		}
	};
	c.get = function(entryURI) {
		return this._cacheIdx[entryURI];
	};
	c.isFresh = function(entry) {
		return !entry.__cacheStale;
	};
	c.addCacheUpdateListener = function(listener) {
		if (listener.__clid != null) {
			listener.__clid = "idx_"+this._listenerCounter;
			this._listenerCounter++;
		}
		this._listenersIdx[listener.__clid] = listener;
	};

	c.removeCacheUpdateListener = function(listener) {
		if (listener.__clid != null) {
			delete this._listenersIdx[listener.__clid];
		}
	};
	
	c.messageListeners = function(topic, affectedEntry) {
		for (var clid in this._listenersIdx) {
			if (this._listenersIdx.hasOwnProperty(clid)) {
				this._listenersIdx[clid](topic, affectedEntry);
			}
		}
	};

	c.allNeedRefresh = function() {
		for (var uri in this._cacheIdx) {
			if (this._cacheIdx.hasOwnProperty(uri)) {
				this.needRefresh(this._cacheIdx[uri], true); //Do not messageListeners for every entry.
			}
		}
		this.messageListeners("allEntriesNeedRefresh");
	};

	return Cache;
});