/*global define*/
define([
	"store/List"
], function(List) {
	
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
		return this._query.getLimit()  || this._entryStore.getFactory().getDefaultLimit();
	};

    /**
     * Get size of list.
     *
     * @returns {integer} the amount of entries in the list, -1 if unknown.
     */
    SList.prototype.getSize = List.prototype.getSize;

    /**
     * Retrieves an array of entries contained in this list according to the current page and pagination settings.
     *
     * @param {integer} page - the page to request an array of entries for, first page is numbered 0.
     * @returns {entryArrayPromise} the promise will return an entry-array.
     * @method
     */
    SList.prototype.getEntries = List.prototype.getEntries;

	/**
	 * Executes a callback on each list members in the order provided by the solr-search.
	 * If the provided function return false for one entry the iteration is stopped and
	 * the function is not called for consecutive matched entries.
	 *
	 * @param {listEntryCallback} func
	 */
	SList.prototype.forEach = List.prototype.forEach;

	//=====Private methods=============	
	
	SList.prototype._forceLoadEntries = function(page) {
		var offset = (page || 0) * this.getLimit();
		this._query.offset(offset);
		var self = this;
		var es = this._entryStore;
		return es.handleAsync(es.getREST().get(this._query.getQuery(es)).then(function(data) {
			return es.getFactory().extractSearchResults(data, self, es);
		}), "search");
	};
	SList.prototype._getEntries = List.prototype._getEntries;
	SList.prototype._update = List.prototype._update;

	return SList;
});
