/*global define*/
define([
	"store/List",
	"store/factory"
], function(List, factory) {
	
	/**
     * @exports store/SearchList
     * @param {store/EntryStore} entryStore
     * @param {Object} query
	 * @constructor
	 */
	var SList = function(entryStore, query) {
		this._entryStore = entryStore;
		this._query = query;
		this._sortedChildren = [];
	};

    /**
     * the query instance, e.g. an instance of store/solr, associated with this SearchList.
     * @returns {Object}
     */
	SList.prototype.getQuery = function() {
		return this._query;
	};
	SList.prototype.setLimit = function(limit) {
		this._query.limit(limit);
	};
	SList.prototype.getLimit = function() {
		return this._query.getLimit()  || factory.getDefaultLimit();
	};

    /**
     * Retrieves an array of entries contained in this list according to the current page and pagination settings.
     *
     * @param {integer} page - the page to request an array of entries for, first page is numbered 0.
     * @returns {dojo/promise/Promise} the promise will return an entry-array.
     * @method
     */
    SList.prototype.getEntries = List.prototype.getEntries;

	//=====Private methods=============	
	
	SList.prototype._forceLoadEntries = function(page) {
		var offset = (page || 0) * this.getLimit();
		this._query.offset(offset);
		var self = this;
		return this._entryStore.getREST().get(this._query.getQuery(this._entryStore)).then(function(data) {
			return factory.extractSearchResults(data, self, self._entryStore);
		});
	};
	SList.prototype._getEntries = List.prototype._getEntries;
	SList.prototype._update = List.prototype._update;

	return SList;
});