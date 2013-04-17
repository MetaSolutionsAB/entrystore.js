/*global define*/
define([
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/Deferred",
	"./rest",
	"./factory"
], function(array, lang, Deferred, rest, factory) {
	
	/**
	 * @param entryInfo that defines the basics of this entry.
	 * @constructor
	 */
	var List = function(entry) {
		this._entry = entry;
		this._cache = entry.getEntryStore()._getCache();
		this._sortedChildren = [];
		this._limit = 100;
		this._unsortedChildren;
	};
	var li = List.prototype; //Shortcut, avoids having to write Entry.prototype below when defining methods.

	li.setLimit = function(limit) {
		this._limit = limit; //TODO check valid limit.
	};
	
	li.setSort = function(params) {
		this._sortParams = params;
	};
	li.forceLoadChildren = function(page) {
		var offset = (page || 0) * this._limit;
		var es = this._entry.getEntryStore();
		return es.getEntry(this._entry.getURI(), {forceLoad: true, offset: offset, limit: this._limit, sort: this._sort})
			.then(lang.hitch(this, function(entry) {
				return this._getChildren(page, false);
			}));
	};
	
	li.getChildren = function(page) {
		var results = this._getChildren(page);
		var def = new Deferred();
		if (results != null) {
			def.resolve(results);
		} else {
			return this.forceLoadChildren(page);
		}
		return def.promise;
	};

	li._getChildren = function(page, careAboutFresh) {
		var offset = (page || 0) * this._limit;

		var needRefresh = false;	
		var results = [];
		var entryURI; 
		for (var i=offset; i<offset+this._limit && i<this._size;i++) {
			entryURI = this._sortedChildren[i];
			if (entryURI) {
				var e = this._cache.get(entryURI);
				if (careAboutFresh !== false && this._cache.isFresh(e)) {
					results.push(e);
				} else {
					needRefresh = true;
					break;
				}
			} else {
				needRefresh = true;
				break;
			}
		}
		if (needRefresh) {
			return null;
		}
		return results;
	};

	//Data contains allUnsorted array, size, and children.
	li.update = function(data, children) {
		var offset = data.offset;
		for (var i=0;i<children.length;i++) {
			this._sortedChildren[i] = children[i].getURI();
		}
		this._size = data.size;
		this._unsortedChildren = data.allUnsorted;
	};
	return List;
});