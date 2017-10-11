/*global define*/
define([
	"store/List"
], function(List) {
	
	/**
     * @exports store/SearchList
     * @param {store/EntryStore} entryStore
     * @param {Object} query
	 * @param {string} callType parameter provided to asyncListeners on query execution, assumed to be 'search' if left out
	 * @constructor
	 */
	var SList = function(entryStore, query, callType) {
		this._entryStore = entryStore;
		this._query = query;
		this._callType = callType || "search";
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

  /**
	 * Array of facets, each facet is an object which contains the following fields:
	 *
	 *  name       - the solr search field this facet corresponds to
	 *  valueCount - the number of values this facet matches
	 *  values     - an array of values matching this facet, with name and count each.
	 *
	 * In addition, when asking for facets for arbitrary predicates there is two additional fields:
	 *
	 *  predicate - the full URI of the predicate this facet corresponds to
	 *  type - the type of the facet values, currently only literal, uri and integer are supported
	 *
	 * Note that you can ask for facets for solr fields like "tags", in this case the above two
	 * fields will be not be present as the "tags" solr field corresponds to a mix of different
	 * predicates and possibly different types.
	 *
	 * Here is an example of a facet for dcat:keyword:
	 * {
	 *    name:  "metadata.predicate.literal_s.a6424133",
	 *    predicate: "http://www.w3.org/ns/dcat#keyword",
	 *    type: "literal",
	 *    valueCount: 3,
	 *    values: [
	 *       {name: "elektrictet", count: 1},
	 *       {name: "finans", count: 1},
	 *       {name: "skatt", count: 1}
	 *    ]
	 * }
	 *
   * @return {Array} never null or undefined, may be an array of length 0 though.
   */
	SList.prototype.getFacets = function() {
		return this.facets;
	};

  SList.prototype.setFacets = function(facetFields) {
    if (!Array.isArray(facetFields) || facetFields.length === 0) {
    	this.facets = [];
		} else {
			this.facets = facetFields;
			var f2p = this._query.facet2predicate;
    	facetFields.forEach(function(ff) {
				if (f2p && f2p[ff.name]) {
					ff.predicate = f2p[ff.name];
				}
				if (ff.name.indexOf('metadata.predicate') === 0) {
					ff.type = ff.name.split('.')[2];
				}
			});
		}
  };

  //=====Private methods=============
	
	SList.prototype._forceLoadEntries = function(page) {
		var offset = (page || 0) * this.getLimit();
		this._query.offset(offset);
		var self = this;
		var es = this._entryStore;
		var self = this;
		return es.handleAsync(es.getREST().get(this._query.getQuery(es)).then(function(data) {
			self.setFacets(data.facetFields);
			return es.getFactory().extractSearchResults(data, self, es);
		}), this._callType);
	};
	SList.prototype._getEntries = List.prototype._getEntries;
	SList.prototype._update = List.prototype._update;

	return SList;
});
