/*global define*/
define([
    "dojo/_base/lang",
    "dojo/_base/array",
	"dojo/Deferred",
    "dojo/json",
    "store/Resource"
], function(lang, array, Deferred, json, Resource) {

    /**
     * List is a container for other entries in the same context.
     * A single entry may appear in multiple lists (multiple parent lists) unless if it is a list itself.
     * To avoid circular references list entries are only allowed to appear in one parent list.
     *
     * @exports store/List
     * @param {string} entryURI - URI to an entry where this resource is contained.
     * @param {string} resourceURI - URI to the resource.
     * @param {store/EntryStore} entryStore - the API's repository instance.
     * @class
     * @augments store/Resource
     */
	var List = function(entryURI, resourceURI, entryStore) {
        Resource.apply(this, arguments); //Call the super constructor.
		this._cache = entryStore.getCache();
		this._sortedChildren = [];
	};

    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    List.prototype = new F();

    /**
     * Set the max amount of entries to include in each page during pagination.
     *
     * @param {integer} limit
     * @returns {store/List} allows chaining of set-operations.
     */
    List.prototype.setLimit = function(limit) {
		this._limit = limit;
		return this;
	};

    /**
     * Get the max amount of entries to include in each page during pagination.
     *
     * @returns {integer}
     */
	List.prototype.getLimit = function() {
        return this._limit || this.getEntryStore().getFactory().getDefaultLimit();
	};

    /**
     * Sets the sort order when loading entries contained in this list.
     *
     * @param {Object} sortParams - same object structure as the sort parameter in optionalLoadParameters
     * in {@link store/EntryStore#getEntry} method.
     * @returns {store/List} allows chaining of set-operations.
     */
	List.prototype.setSort = function(sortParams) {
        this._clearSortedEntries();
        this._sortParams = sortParams;
		return this;
	};

    /**
     * Retrieves an array of entries contained in this list according to the current page and pagination settings.
     * @param {integer} page - the page to request an array of entries for, first page is numbered 0.
     * @returns {entryArrayPromise} the promise will return an entry-array.
     */
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


    /**
     * Executes a callback on each list members in the order provided by the list.
     * If the provided function return false for one entry the iteration is stopped and
     * the function is not called for consecutive entries.
     *
     * @param {listEntryCallback} func
     * @return {promise} called with two parameters, the first a boolean saying if all entries where passed, the second an index telling how many entrys iterated over.
     */
    List.prototype.forEach = function(func, onFinish) {
        var page = 0, idx = 0, limit = this.getLimit(), self = this;

        var f = function(entries) {
            var g, h, entriesLength = entries.length;
            g = function(res) {
                if (res === false) {
                    var d = new Deferred();
                    d.resolve(false);
                    return d;
                } else {
                    return h();
                }
            };
            h = function() {
                if (entries.length === 0) {
                    var d = new Deferred();
                    d.resolve(true);
                    return d;
                }
                var res = func(entries.pop(), idx);
                idx++;
                if (typeof res !== "undefined" && typeof res.then === "function") {
                    return res.then(g);
                } else {
                    return g(res);
                }
            };
            return h().then(function(cont) {
                if (cont !== false && entriesLength === limit) {
                    page++;
                    return self.getEntries(page).then(f);
                } else {
                    var d = new Deferred();
                    d.resolve(idx);
                    return d;
                }
            });
        };

        return this.getEntries(0).then(f);
    };

    /**
     * Adds an entry to this list, on success the entry will be marked as in need of a refresh.
     * The reason is that its modification date and inverse relation cache will not be totally correct anymore.
     *
     * @param {store/Entry} entry - entry to add to the list.
     * @returns {xhrPromise}
     */
    List.prototype.addEntry = function(entry) {
      var self = this;
      return this.getAllEntryIds().then(lang.hitch(this, function(entries) {
            entries.push(entry.getId());
            return this.setAllEntryIds(entries, "addToList").then(function() {
                entry.setRefreshNeeded();
                return self.getEntry();
            });
        }));
    };

    /**
     * Removes an entry from this list, on success the entry will be marked as in need of a refresh.
     * The reason is that its modification date and inverse relation cache will not be totally correct anymore.

     * @param {store/Entry} entry - entry to be removed from the list.
     * @returns {xhrPromise}
     */
    List.prototype.removeEntry = function(entry) {
      return this.getAllEntryIds().then(lang.hitch(this, function(entries) {
            entries.splice(entries.indexOf(entry.getId()), 1);
            return this.setAllEntryIds(entries, "removeFromList").then(function() {
                entry.setRefreshNeeded();
            });
        }));
    };

    /**
     * Will unset things since the cache is stale...
     */
    List.prototype.needRefresh = function() {
        delete this._unsortedChildren;
        this._sortedChildren = [];
        delete this._size;
    };

    /**
     * Get a list of entry ids contained in this list.
     *
     * @returns {stringArrayPromise} the promise will deliver an array of children entries in this list as ids
     * (strings, not full URIs).
     */
    List.prototype.getAllEntryIds = function() {
        var d = new Deferred();
        if (this._unsortedChildren != null) {
            d.resolve(this._unsortedChildren);
        } else {
            this.getEntries().then(lang.hitch(this, function() {
                d.resolve(this._unsortedChildren);
            }));
        }
        return d.promise;
    };

    /**
     * Set a list of entry ids to be contained in this list.
     *
     * @param {string[]} entries - array of entry ids (as strings, not full URIs).
     * @returns {entryPromise}
     */
    List.prototype.setAllEntryIds = function(entries, callType) {
      var es = this._entryStore;
      return es.handleAsync(es.getREST().put(this._resourceURI, json.stringify(entries))
            .then(lang.hitch(this, function() {
                this.needRefresh();
                return es.getEntry(this.getEntryURI()).then(function(oentry) {
                    oentry.setRefreshNeeded();
                    return oentry;
                });
            })), callType || "setList");
    };

    /**
     * Get size of list.
     *
     * @returns {integer} the amount of entries in the list, -1 if unknown.
     */
    List.prototype.getSize = function() {
        return typeof this._size === "number" ? this._size : -1;
    };

    //=========Helper methods===============

    List.prototype._clearSortedEntries = function() {
        this._sortedChildren = [];
    };

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
				var e = this._entryStore.getCache().get(entryURI);
				if (careAboutFresh === false || (e != null && !e.needRefresh())) {
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
		return this._entryStore.getEntry(this._entryURI, {
            forceLoad: true,
            offset: offset,
            limit: limit,
            sort: this._sort,
            asyncContext: "loadListEntries"
        }).then(lang.hitch(this, function() {
            return this._getEntries(page, false);
        }));
	};

    //Data contains allUnsorted array, size, and children.
    List.prototype._update = function(data, children) {
        var offset = data.offset || 0;
        for (var i=0;i<children.length;i++) {
            this._sortedChildren[offset+i] = children[i].getURI();
        }
        this._size = data.size || children.length;
        this._unsortedChildren = data.allUnsorted || array.map(children, function(entry) {
            return entry.getId();
        });
    };

    return List;
});

/**
 * Promise that provides an array of entry ids (not full URIs) on success.
 *
 * @name stringArrayPromise
 * @extends dojo/promise/Promise
 * @class
 */
/**
 * @name stringArrayPromise#then
 * @param {stringArrayCallback} onSuccess
 * @param {xhrFailureCallback} onError
 */
/**
 * @callback stringArrayCallback
 * @param {string[]} idArray
 */

/**
 * Callback in list forEach method.
 *
 * @callback listEntryCallback
 * @param {store/Entry} entry
 * @param {number} index
 */