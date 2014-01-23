/*global define*/
define([
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/Deferred",
    "./Resource",
	"./factory"
], function(array, lang, Deferred, Resource, factory) {

    /**
     * @param {String} entryURI in which this List is a resource.
     * @param {String} resourceURI
     * @param {store.EntryStore} entryStore
     * @constructor
     * @extends store.Resource
     */
	var List = function(entryURI, resourceURI, entryStore) {
        Resource.apply(this, arguments); //Call the super constructor.
		this._cache = entryStore.getCache();
		this._sortedChildren = [];
//		this._unsortedChildren;
	};

    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    List.prototype = new F();

    List.prototype.setLimit = function(limit) {
		this._limit = limit; //TODO check valid limit.
		return this;
	};
	List.prototype.getLimit = function() {
		return this._limit || factory.getDefaultLimit();
	};

	List.prototype.setSort = function(params) {
		this._sortParams = params;
		return this;
	};
	
	List.prototype.getEntries = function(page) {
		var results = this._getEntries(page);
		var def = new Deferred();
		if (results != null) {
			def.resolve(results);
		} else {
			return this._forceLoadEntries(page);
		}
		return def.promise;
	};

    List.prototype.getSize = function() {
        return this._size;
    };
	
	//=========Helper methods===============

	List.prototype._getEntries = function(page, careAboutFresh) {
		if (this._size == null) {
			return null;
		}
		var limit = this.getLimit();
		var offset = (page || 0) * limit;

		var needRefresh = false;	
		var results = [];
		var entryURI; 
		for (var i=offset; i<offset+limit && i<this._size;i++) {
			entryURI = this._sortedChildren[i];
			if (entryURI) {
				var e = this._cache.get(entryURI);
				if (careAboutFresh === false || !this._cache.needRefresh(e)) {
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

	List.prototype._forceLoadEntries = function(page) {
		var limit = this.getLimit();
		var offset = (page || 0) * limit;
		return this._entryStore.getEntry(this._entryURI, {forceLoad: true, offset: offset, limit: limit, sort: this._sort})
			.then(lang.hitch(this, function() {
				return this._getEntries(page, false);
			}));
	};

	//Data contains allUnsorted array, size, and children.
	List.prototype._update = function(data, children) {
		var offset = data.offset;
		for (var i=0;i<children.length;i++) {
			this._sortedChildren[offset+i] = children[i].getURI();
		}
		this._size = data.size;
//		this._unsortedChildren = data.allUnsorted;
	};
	return List;
});