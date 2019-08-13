/**
 * EntryStoreUtil provides utility functionality for working with entries.
 * @exports EntryStoreUtil
 */
export default class EntryStoreUtil {
  /**
   * @param {EntryStore} entrystore
   */
  constructor(entrystore) {
    this._entrystore = entrystore;
    this._preloadIdx = new Map();
  }

  /**
   * @returns {EntryStore}
   */
  getEntryStore() {
    return this._entrystore;
  }

  /**
   * Preload entries of a specific type.
   * Not strictly needed, used for optimization reasons.
   * Up to a maximum of 100 entries are preloaded.
   *
   * @param {string} ofType
   * @param {Context} context if provided limits the preload to a specific context.
   * @returns {Entry}
   */
  preloadEntries(ofType, context) {
    let preloadForType = this._preloadIdx.get(ofType);
    let promise;
    if (preloadForType) {
      if (context) {
        promise = preloadForType[context.getEntryURI()];
        if (promise) {
          return promise;
        }
      } else if (preloadForType.noContext) {
        return preloadForType.noContext;
      }
    } else {
      preloadForType = {};
      this._preloadIdx.set(ofType, preloadForType);
    }

    const searchObj = this._entrystore.newSolrQuery().resourceType(ofType).limit(100);
    if (context) {
      searchObj.context(context);
    }
    const list = searchObj.list();
    promise = list.getEntries(0);
    if (context) {
      preloadForType[context.getEntryURI()] = promise;
    } else {
      preloadForType.noContext = promise;
    }
    return promise;
  }

  clearPreloadEntriesDuplicateCheck(ofType, inContext) {
    if (ofType) {
      const preloadForType = this._preloadIdx.get(ofType);
      if (preloadForType && inContext) {
        delete preloadForType[inContext.getEntryURI()];
      } else {
        this._preloadIdx.delete(ofType);
      }
    } else {
      this._preloadIdx = new Map();
    }
  }

  /**
   * Retrieves an entry for a resource URI, note that if there are several entries that all
   * have the same resource URI it is unclear which of these entries that are returned.
   * Hence, only use this function if you expect there to be a single entry per resource URI.
   *
   * @param {string} resourceURI is the URI for the resource.
   * @param {Context=} context only look for entries in this context, may be left out.
   * @param {string} asyncCallType the callType used when making the search.
   * @returns {Promise.<Entry>}
   * @async
   * @throws Error
   */
  async getEntryByResourceURI(resourceURI, context, asyncCallType) {
    const cache = this._entrystore.getCache();
    const entriesSet = cache.getByResourceURI(resourceURI);
    if (context) {
      for (const entry of entriesSet) { // eslint-disable-line
        if (entry.getContext().getId() === context.getId()) {
          return Promise.resolve(entry);
        }
      }
    }
    const query = this._entrystore.newSolrQuery().resource(resourceURI).limit(1);
    if (context) {
      query.context(context);
    }
    const entryArr = await query.list(asyncCallType).getEntries(0);
    if (entryArr.length > 0) {
      return entryArr[0];
    }
    throw new Error(`No entries for resource with URI: ${resourceURI}`);
  }

  /**
   * @param {string} resourceURI is the URI for the resource.
   * @returns {Entry}
   */
  getEntryListByResourceURI(resourceURI) {
    return this._entrystore.newSolrQuery().resource(resourceURI).list();
  }

  /**
   * Attempting to find a unique entry for a specific type,
   * if multiple entries exists with the same type the returned promise fails.
   * You may restrict to a specific context.
   *
   * @param {string} typeURI is the rdf:type URI for the entry to match.
   * @param {Context} context restrict to finding the entry in this context
   * @param {string} asyncCallType the callType used when making the search.
   * @returns {Promise.<Entry>}
   * @async
   * @throws Error
   */
  async getEntryByType(typeURI, context, asyncCallType) {
    const query = this._entrystore.newSolrQuery().rdfType(typeURI).limit(2);
    if (context) {
      query.context(context);
    }
    const entryArr = await query.list(asyncCallType).getEntries(0);
    if (entryArr.length === 1) {
      return entryArr[0];
    }
    throw new Error('Wrong number of entries in context / repository');
  }

  /**
   * Attempting to find one entry for a specific graph type,
   * if multiple entries exists with the same type the returned promise fails.
   * You may restrict to a specific context.
   *
   * @param {string} graphType is the graph type for the entry to match, e.g. use
   * {@see types#GT_USER}.
   * @param {Context} context restrict to finding the entry in this context
   * @param {string} asyncCallType the callType used when making the search.
   * @returns {Promise.<Entry>}
   * @async
   * @throws Error
   */
  async getEntryByGraphType(graphType, context, asyncCallType) {
    const query = this._entrystore.newSolrQuery().graphType(graphType).limit(2);
    if (context) {
      query.context(context);
    }
    const entryArr = await query.list(asyncCallType).getEntries(0);
    if (entryArr.length > 0) {
      return entryArr[0];
    }
    throw new Error(`No entries in ${context ? 'context' : 'repository'} context with graphType ${graphType}`);
  }

  /**
   * Removes all entries matched by a search in a serial manner,
   * also empties the cache from loaded entries so it should not overflow
   * if the searchlist is big.
   *
   * The removal is accomplished by first iterating through the searchlist and collecting
   * uris to all entries that should be removed. After that the entries are removed.
   *
   * @param {SearchList} list
   * @returns {Promise}
   */
  async removeAll(list) {
    const uris = [];
    const es = this._entrystore;
    const cache = es.getCache();
    const rest = es.getREST();

    const deleteNext = async () => {
      if (uris.length > 0) {
        const uri = uris.pop();
        try {
          await rest.del(uri);
        } catch (err) {
          console.log(`Could not remove entry with uri: ${uri} continuing anyway.`);
        }
        deleteNext();
      }
      return undefined;
    };

    const result = await list.forEach((entry) => {
      uris.push(entry.getURI());
      cache.unCache(entry); // @todo @valentino perhaps they are removed from cache too early. Move to deleteNext?
    });

    deleteNext(result);
  }
}

