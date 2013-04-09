/*global define*/
define([], function() {
	
	var _listenerCounter = 0;
	var _listeners = {};


	var _cache = {};	
	var cache = {};
	
	cache.cache = function(entry) {
		_cache[entry.getURI()] = {time: new Date().getTime(), entry: entry};
	};
	cache.cacheAll = function(entryArr) {
		for (var i=0; i<entryArr.length;i++) {
			cache.cache(entryArr[i]);
		}
	};
	cache.get = function(entryURI) {
		var s = _cache[entryURI];
		if (s) {
			return s.entry;
		}
	};
	cache.addCacheUpdateListener = function(listener) {
		if (listener.__clid != null) {
			listener.__clid = "idx_"+_listenerCounter;
			_listenerCounter++;
		}
		_listeners[listener.__clid] = listener;
	};

	cache.removeCacheUpdateListener = function(listener) {
		if (listener.__clid != null) {
			delete _listeners[listener.__clid];
		}
	};
	
	cache.messageListeners = function(topic, affectedEntry) {
		for (var clid in _listeners) {
			if (_listeners.hasOwnProperty(clid)) {
				_listeners[clid](topic, affectedEntry);
			}
		}		
	};

	cache.invalidateCache = function() {
		for (var uri in _cache) {
			if (_cache.hasOwnProperty(uri)) {
				_cache[uri].entry.invalidate(false); //Do not messageListeners for every entry.
			}
		}
		cache.messageListeners("allEntriesInvalidated");
	};
	
	return cache;
});