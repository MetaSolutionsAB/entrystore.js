import Resource from './Resource';

/**
 * List is a container for other entries in the same context.
 * A single entry may appear in multiple lists (multiple parent lists) unless if it is
 * a list itself. To avoid circular references list entries are only allowed to appear
 * in one parent list.
 *
 * @exports store/List
 */
const List = class extends Resource {
  /**
   * @param {string} entryURI - URI to an entry where this resource is contained.
   * @param {string} resourceURI - URI to the resource.
   * @param {store/EntryStore} entryStore - the API's repository instance.
   */
  constructor(entryURI, resourceURI, entryStore) {
    super(entryURI, resourceURI, entryStore);
    this._cache = entryStore.getCache();
    this._sortedChildren = [];
  }

  /**
   * Set the max amount of entries to include in each page during pagination.
   *
   * @param {integer} limit
   * @returns {store/List} allows chaining of set-operations.
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
    return this._limit || this.getEntryStore().getFactory().getDefaultLimit();
  }

  /**
   * Sets the sort order when loading entries contained in this list.
   *
   * @param {Object} sortParams - same object structure as the sort parameter in
   * optionalLoadParameters in {@link store/EntryStore#getEntry} method.
   * @returns {store/List} allows chaining of set-operations.
   */
  setSort(sortParams) {
    this._clearSortedEntries();
    this._sortParams = sortParams;
    return this;
  }

  /**
   * Retrieves an array of entries contained in this list according to the current page and
   * pagination settings.
   * @param {integer} page - the page to request an array of entries for,
   * first page is numbered 0.
   * @returns {entryArrayPromise} the promise will return an entry-array.
   */
  getEntries(page) {
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
   * @param {listEntryCallback} func
   * @return {promise} called with two parameters, the first a boolean saying if all entries
   * where passed, the second an index telling how many entrys iterated over.
   */
  forEach(func) {
    let page = 0;
    let idx = 0;
    let g;
    let h;
    const limit = this.getLimit();
    const self = this;

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
          return self.getEntries(page).then(f);
        }
        return Promise.resolve(idx);
      });
    };

    return this.getEntries(0).then(f);
  }

  /**
   * Adds an entry to this list, on success the List entry will be returned (updated with
   * latest modification date). The added entry will be marked as in need of a
   * refresh due to stale inv-rel cache. However,since List entry is loaded it may be refreshed
   * already when method is resolved, it depends if it is in the first page of the list.
   *
   * @param {store/Entry} entry - entry to add to the list.
   * @returns {xhrPromise}
   */
  addEntry(entry) {
    const self = this;
    return this.getAllEntryIds().then((entries) => {
      entries.push(entry.getId());
      return this.setAllEntryIds(entries, 'addToList').then(() => {
        entry.setRefreshNeeded();
        return self.getEntry();
      });
    });
  }

  /**
   * Removes an entry from this list, on success the List entry will be returned (updated with
   * latest modification date). The removed entry will not be updated but marked as in need
   * of a refresh due to stale inv-rel cache. However,since List entry is loaded it may be
   * refreshed already when method is resolved, it depends if it is in the first page of the list.
   *
   * @param {store/Entry} entry - entry to be removed from the list.
   * @returns {xhrPromise}
   */
  removeEntry(entry) {
    return this.getAllEntryIds().then((entries) => {
      entries.splice(entries.indexOf(entry.getId()), 1);
      return this.setAllEntryIds(entries, 'removeFromList').then(() => {
        entry.setRefreshNeeded();
      });
    });
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
   * @returns {stringArrayPromise} the promise will deliver an array of children entries in this
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
   * @returns {entryPromise}
   */
  setAllEntryIds(entries, callType) {
    const es = this._entryStore;
    return es.handleAsync(es.getREST().put(this._resourceURI, JSON.stringify(entries))
      .then(() => {
        this.needRefresh();
        return es.getEntry(this.getEntryURI()).then((oentry) => {
          oentry.setRefreshNeeded();
          return oentry;
        });
      }), callType || 'setList');
  }

  /**
   * Get size of list.
   *
   * @returns {integer} the amount of entries in the list, -1 if unknown.
   */
  getSize() {
    return typeof this._size === 'number' ? this._size : -1;
  }

  //= ========Helper methods===============

  _clearSortedEntries() {
    this._sortedChildren = [];
  }

  _getEntries(page, careAboutFresh) {
    if (this._size == null) {
      return null;
    }
    const limit = this.getLimit();
    const offset = (page || 0) * limit;

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

  _forceLoadEntries(page) {
    const limit = this.getLimit();
    const offset = (page || 0) * limit;
    return this._entryStore.getEntry(this._entryURI, {
      forceLoad: true,
      offset,
      limit,
      sort: this._sort,
      asyncContext: 'loadListEntries',
    }).then(() => this._getEntries(page, false));
  }

  // Data contains allUnsorted array, size, and children.
  _update(data, children) {
    const offset = data.offset || 0;
    for (let i = 0; i < children.length; i++) {
      this._sortedChildren[offset + i] = children[i].getURI();
    }
    this._size = data.size || children.length;
    this._unsortedChildren = data.allUnsorted || children.map(entry => entry.getId());
  }
};

export default List;

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
