/*global define*/
define([], function() {
	
	
	var Cache = function() {
		this._listenerCounter = 0;
		this._listenersIdx = {};
		this._cacheIdx = {};		
	};
	var c = Cache.prototype;
	
	c.cache = function(entry) {
		this._cacheIdx[entry.getURI()] = {time: new Date().getTime(), entry: entry};
	};
	
	c.cacheAll = function(entryArr) {
		for (var i=0; i<entryArr.length;i++) {
			this.cache(entryArr[i]);
		}
	};
	c.get = function(entryURI) {
		var s = c._cacheIdx[entryURI];
		if (s) {
			return s.entry;
		}
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

	c.invalidateCache = function() {
		for (var uri in this._cacheIdx) {
			if (this._cacheIdx.hasOwnProperty(uri)) {
				this._cacheIdx[uri].entry.invalidate(false); //Do not messageListeners for every entry.
			}
		}
		this.messageListeners("allEntriesInvalidated");
	};

	return Cache;
});