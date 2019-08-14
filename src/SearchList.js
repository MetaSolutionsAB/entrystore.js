import EntryStore from './EntryStore';
import List from './List';
import factory from './factory';

/**
 * @exports SearchList
 */
export default class SearchList {

  /**
   * @param {EntryStore} entryStore
   * @param {Object} query
   * @param {string} callType parameter provided to asyncListeners on query execution,
   * assumed to be 'search' if left out
   */
  constructor(entryStore, query, callType) {
    this._entryStore = entryStore;
    this._query = query;
    this._callType = callType || 'search';
    this._sortedChildren = [];
  }

  /**
   * the query instance, e.g. an instance of SolrQuery, associated with this SearchList.
   * @returns {Object}
   */
  getQuery() {
    return this._query;
  }

  setLimit(limit) {
    this._query.limit(limit);
  }

  getLimit() {
    return this._query.getLimit() || factory.getDefaultLimit();
  }

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
   *   name:  "metadata.predicate.literal_s.a6424133",
   *   predicate: "http://www.w3.org/ns/dcat#keyword",
   *   type: "literal",
   *   valueCount: 3,
   *   values: [
   *      {name: "elektrictet", count: 1},
   *      {name: "finans", count: 1},
   *      {name: "skatt", count: 1}
   *   ]
   * }
   *
   * @return {Array} never null or undefined, may be an array of length 0 though.
   */
  getFacets() {
    return this.facets;
  }

  setFacets(facetFields) {
    if (!Array.isArray(facetFields) || facetFields.length === 0) {
      this.facets = [];
    } else {
      this.facets = facetFields;
      const f2p = this._query.facet2predicate;
      facetFields.forEach((ff) => {
        if (f2p && f2p[ff.name]) {
          ff.predicate = f2p[ff.name];
        }
        if (ff.name.startsWith('metadata.predicate')) {
          ff.type = ff.name.split('.')[2];
        } else if (ff.name.startsWith('related.metadata.predicate')) {
          ff.type = ff.name.split('.')[3];
        }
      });
    }
  }

  /**
   *
   * @param {number} [page=0]
   * @return {Promise}
   * @private
   */
  _forceLoadEntries(page = 0) {
    const offset = page * this.getLimit();
    this._query.offset(offset);
    return this._entryStore.handleAsync(this._entryStore.getREST().get(this._query.getQuery(this._entryStore))
      .then((data) => {
        this.setFacets(data.facetFields);
        return factory.extractSearchResults(data, this, this._entryStore);
      }), this._callType);
  }
}

/**
 * Get size of list.
 *
 * @returns {number} the amount of entries in the list, -1 if unknown.
 */
SearchList.prototype.getSize = List.prototype.getSize;

/**
 * Retrieves an array of entries contained in this list according to the current page and
 * pagination settings.
 *
 * @param {integer} page - the page to request an array of entries for, first page is numbered 0.
 * @returns {Promise.<Array.<Entry>>} the promise will return an entry-array.
 * @method
 */
SearchList.prototype.getEntries = List.prototype.getEntries;

/**
 * Executes a callback on each list members in the order provided by the solr-search.
 * If the provided function return false for one entry the iteration is stopped and
 * the function is not called for consecutive matched entries.
 *
 * @param {Function} func
 */
SearchList.prototype.forEach = List.prototype.forEach;
SearchList.prototype._getEntries = List.prototype._getEntries;
SearchList.prototype._update = List.prototype._update;

