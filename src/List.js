import Resource from './Resource.js';
import factory from './factory.js';

/**
 * List is a container for other entries in the same context.
 * A single entry may appear in multiple lists (multiple parent lists) unless if it is
 * a list itself. To avoid circular references list entries are only allowed to appear
 * in one parent list.
 *
 * @exports store/List
 */
export default class List extends Resource {
  /**
   * @param {string} entryURI - URI to an entry where this resource is contained.
   * @param {string} resourceURI - URI to the resource.
   * @param {EntryStore} entryStore - the API's repository instance.
   */
  constructor(entryURI, resourceURI, entryStore) {
    super(entryURI, resourceURI, entryStore);
    this._cache = entryStore.getCache();
    /**
     * Array of entry URIs
     * @type {Array.<string>}
     * @private
     */
    this._sortedChildren = [];
  }

  /**
   * Set the max amount of entries to include in each page during pagination.
   *
   * @param {integer} limit
   * @returns {List} allows chaining of set-operations.
   */
  setLimit(limit) {
    this._limit = limit;
    return this;
  }

  /**
   * Get the max amount of entries to include in each page during pagination.
   *
   * @returns {integer}
   */
  getLimit() {
    return this._limit || factory.getDefaultLimit();
  }

  /**
   * Sets the sort order when loading entries contained in this list.
   *
   * @param {Object} sortParams - same object structure as the sort parameter in
   * optionalLoadParameters in {@link EntryStore#getEntry} method.
   * @returns {List} allows chaining of set-operations.
   */
  setSort(sortParams) {
    this._clearSortedEntries();
    this._sortParams = sortParams;
    return this;
  }

  /**
   * Retrieves an array of entries contained in this list according to the current page and
   * pagination settings.
   * @param {number} page - the page to request an array of entries for,
   * first page is numbered 0.
   * @returns {Promise.<Entry[]>} the promise will return an entry-array.
   */
  getEntries(page = 0) {
    const results = this._getEntries(page);
    if (results != null) {
      return Promise.resolve(results);
    }
    return this._forceLoadEntries(page);
  }

  /**
   * Executes a callback on each list members in the order provided by the list.
   * If the provided function return false for one entry the iteration is stopped and
   * the function is not called for consecutive entries.
   *
   * @param {Function} func
   * @return {Promise} called with two parameters, the first a boolean saying if all entries
   * where passed, the second an index telling how many entries iterated over.
   */
  forEach(func) {
    let page = 0;
    let idx = 0;
    let g;
    let h;
    const limit = this.getLimit();

    const f = (entries) => {
      const entriesLength = entries.length;
      g = (res) => {
        if (res === false) {
          return Promise.resolve(false);
        }
        return h();
      };
      h = () => {
        if (entries.length === 0) {
          return Promise.resolve(true);
        }
        const res = func(entries.shift(), idx);
        idx += 1;
        if (typeof res !== 'undefined' && typeof res.then === 'function') {
          return res.then(g);
        }
        return g(res);
      };
      return h().then((cont) => {
        if (cont !== false && entriesLength === limit) {
          page += 1;
          return this.getEntries(page).then(f);
        }
        return Promise.resolve(idx);
      });
    };

    return this.getEntries(0).then(f);
  }

  /**
   * Loops through with forEach and accumulates the entries in a single array.
   * Note! this might be memory intensive for large lists
   * @see forEach
   * @returns {Promise.<Entry[]>}
   * @todo add tests
   */
  async getAllEntries() {
    const entries = [];
    await this.forEach(entry => entries.push(entry));

    return entries;
  }

  /**
   * Adds an entry to this list, on success the List entry will be returned (updated with
   * latest modification date). The added entry will be marked as in need of a
   * refresh due to stale inv-rel cache. However,since List entry is loaded it may be refreshed
   * already when method is resolved, it depends if it is in the first page of the list.
   *
   * @param {Entry} entry - entry to add to the list.
   * @returns {Promise.<Entry>}
   */
  async addEntry(entry) {
    const entries = await this.getAllEntryIds();
    entries.push(entry.getId());
    await this.setAllEntryIds(entries, 'addToList');
    return this.getEntry();
  }

  /**
   * Removes an entry from this list, on success the List entry will be returned (updated with
   * latest modification date). The removed entry will not be updated but marked as in need
   * of a refresh due to stale inv-rel cache. However,since List entry is loaded it may be
   * refreshed already when method is resolved, it depends if it is in the first page of the list.
   *
   * @param {Entry} entry - entry to be removed from the list.
   * @returns {Promise}
   */
  async removeEntry(entry) {
    const entries = await this.getAllEntryIds();
    entries.splice(entries.indexOf(entry.getId()), 1);
    await this.setAllEntryIds(entries, 'removeFromList');
    return this.getEntry();
  }

  /**
   * Will unset things since the cache is stale...
   */
  needRefresh() {
    delete this._unsortedChildren;
    this._sortedChildren = [];
    delete this._size;
  }

  /**
   * Get a list of entry ids contained in this list.
   *
   * @returns {Promise.<Array.<string>>} the promise will deliver an array of children entries in this
   * list as ids
   * (strings, not full URIs).
   */
  getAllEntryIds() {
    if (this._unsortedChildren != null) {
      return Promise.resolve(this._unsortedChildren);
    }
    return this.getEntries().then(() => this._unsortedChildren);
  }

  /**
   * Set a list of entry ids to be contained in this list.
   *
   * @param {string[]} entries - array of entry ids (as strings, not full URIs).
   * @param {string} callType
   * @returns {Promise.<Entry>}
   */
  async setAllEntryIds(entries, callType) {
    const es = this.getEntryStore();
    const entry = await this.getEntry();
    const entryInfo = entry.getEntryInfo();
    const promise = es.getREST().put(this._resourceURI, JSON.stringify(entries));
    es.handleAsync(promise, callType || 'setList');
    const response = await promise;
    entryInfo.setModificationDate(response.header['last-modified']);
    return entry;
  }

  /**
   * Get size of list.
   *
   * @returns {number} the amount of entries in the list, -1 if unknown.
   */
  getSize() {
    return typeof this._size === 'number' ? this._size : -1;
  }

  //= ========Helper methods===============

  _clearSortedEntries() {
    this._sortedChildren = [];
  }

  /**
   *
   * @param page
   * @param careAboutFresh
   * @return {null|Array}
   * @private
   */
  _getEntries(page = 0, careAboutFresh = false) {
    if (this._size == null) {
      return null;
    }
    const limit = this.getLimit();
    const offset = page * limit;

    let needRefresh = false;
    const results = [];
    let entryURI;
    for (let i = offset; i < offset + limit && i < this._size; i++) {
      entryURI = this._sortedChildren[i];
      if (entryURI) {
        const e = this._entryStore.getCache().get(entryURI);
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
  }

  /**
   *
   * @param page
   * @return {*|Promise<Array | never>}
   * @private
   */
  _forceLoadEntries(page = 0) {
    const limit = this.getLimit();
    const offset = page * limit;
    return this._entryStore.getEntry(this._entryURI, {
      forceLoad: true,
      offset,
      limit,
      sort: this._sort,
      asyncContext: 'loadListEntries',
    }).then(() => this._getEntries(page, false));
  }


  /**
   * Data contains allUnsorted array, size, and children.
   *
   * @param data
   * @param children
   * @private
   */
  _update(data, children) {
    const offset = data.offset || 0;
    for (let i = 0; i < children.length; i++) {
      this._sortedChildren[offset + i] = children[i].getURI();
    }
    this._size = data.size || children.length;
    this._unsortedChildren = data.allUnsorted || children.map(entry => entry.getId());
  }
};
