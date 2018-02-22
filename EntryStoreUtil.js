define([], () => {
  /**
   * EntryStoreUtil provides utility functionality for working with entries.
   * @param {store/EntryStore} entrystore
   * @exports store/EntryStoreUtil
   * @class
   */
  const EntryStoreUtil = class {
    constructor(entrystore) {
      this._entrystore = entrystore;
      this._preloadIdx = {};
    }

    /**
     * @returns {store/EntryStore}
     */
    getEntryStore() {
      return this._entrystore;
    }

    /**
     * Preload entries of a specific type.
     * Not strictly needed, used for optimization reasons.
     * Up to a maximum of 100 entries are preloaded.
     *
     * @param {string} typeURI
     * @param {store/context} inContext if provided limits the preload to a specific context.
     * @returns {store/Entry}
     */
    preloadEntries(ofType, inContext) {
      let preloadForType = this._preloadIdx[ofType];
      let promise;
      if (preloadForType) {
        if (inContext) {
          promise = preloadForType[inContext.getEntryURI()];
          if (promise) {
            return promise;
          }
        } else if (preloadForType.noContext) {
          return preloadForType.noContext;
        }
      } else {
        preloadForType = {};
        this._preloadIdx[ofType] = preloadForType;
      }

      const searchObj = this._entrystore.newSolrQuery().resourceType(ofType).limit(100);
      if (inContext) {
        searchObj.context(inContext);
      }
      const list = searchObj.list();
      promise = list.getEntries(0);
      if (inContext) {
        preloadForType[inContext.getEntryURI()] = promise;
      } else {
        preloadForType.noContext = promise;
      }
      return promise;
    }

    clearPreloadEntriesDuplicateCheck(ofType, inContext) {
      if (ofType) {
        const preloadForType = this._preloadIdx[ofType];
        if (preloadForType && inContext) {
          delete preloadForType[inContext.getEntryURI()];
        } else {
          delete this._preloadIdx[ofType];
        }
      } else {
        this._preloadIdx = {};
      }
    }

    /**
     * Retrieves an entry for a resource URI, note that if there are several entries that all
     * have the same resource URI it is unclear which of these entries that are returned.
     * Hence, only use this function if you expect there to be a single entry per resource URI.
     *
     * @param {string} resourceURI is the URI for the resource.
     * @param {store/Context=} context only look for entries in this context, may be left out.
     * @param {string} asyncCallType the callType used when making the search.
     * @returns {entryPromise}
     */
    getEntryByResourceURI(resourceURI, context, asyncCallType) {
      const cache = this._entrystore.getCache();
      let entryArr = cache.getByResourceURI(resourceURI);
      if (context) {
        entryArr = entryArr.filter(e => e.getContext().getId() === context.getId());
      }
      if (entryArr.length > 0) {
        return Promise.resolve(entryArr[0]);
      }
      const query = this._entrystore.newSolrQuery().resource(resourceURI).limit(1);
      if (context) {
        query.context(context);
      }
      return query.list(asyncCallType).getEntries(0).then((arr) => {
        if (arr.length > 0) {
          return arr[0];
        }
        throw new Error(`No entries for resource with URI: ${resourceURI}`);
      });
    }

    /**
     * @param {string} resourceURI is the URI for the resource.
     * @returns {store/Entry}
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
     * @param {store/Context} context restrict to finding the entry in this context
     * @param {string} asyncCallType the callType used when making the search.
     * @returns {entryPromise}
     */
    getEntryByType(typeURI, context, asyncCallType) {
      const query = this._entrystore.newSolrQuery().rdfType(typeURI).limit(2);
      if (context) {
        query.context(context);
      }
      return query.list(asyncCallType).getEntries(0).then((entryArr) => {
        if (entryArr.length === 1) {
          return entryArr[0];
        }
        throw new Error('Wrong number of entrys in context / repository');
      });
    }

    /**
     * Attempting to find one entry for a specific graph type,
     * if multiple entries exists with the same type the returned promise fails.
     * You may restrict to a specific context.
     *
     * @param {string} graphType is the graph type for the entry to match, e.g. use
     * {@see store/types#GT_USER}.
     * @param {store/Context} context restrict to finding the entry in this context
     * @param {string} asyncCallType the callType used when making the search.
     * @returns {entryPromise}
     */
    getEntryByGraphType(graphType, context, asyncCallType) {
      const query = this._entrystore.newSolrQuery().graphType(graphType).limit(2);
      if (context) {
        query.context(context);
      }
      return query.list(asyncCallType).getEntries(0).then((entryArr) => {
        if (entryArr.length > 0) {
          return entryArr[0];
        }
        if (context) {
          throw new Error(`No entrys in context with graphType ${graphType}`);
        } else {
          throw new Error(`No entrys in repository with graphType ${graphType}`);
        }
      });
    }

    /**
     * Removes all entries matched by a search in a serial manner,
     * also empties the cache from loaded entries so it should not overflow
     * if the searchlist is big.
     *
     * The removal is accomplished by first iterating through the searchlist and collecting
     * uris to all entries that should be removed. After that the entries are removed.
     *
     * @param {store/SearchList} list
     * @returns {successOrFailPromise}
     */
    removeAll(list) {
      const uris = [];
      const es = this._entrystore;
      const cache = es.getCache();
      const rest = es.getREST();
      const f = () => {
        if (uris.length > 0) {
          const uri = uris.pop();
          return rest.del(uri).then(f, () => {
            console.log(`Could not remove entry with uri: ${uri} continuing anyway.`);
            return f();
          });
        }
        return undefined;
      };
      return list.forEach((entry) => {
        uris.push(entry.getURI());
        cache.unCache(entry);
      }).then(() => f());
    }
  };
  return EntryStoreUtil;
});

/**
 * @name successOrFailPromise
 * @extends dojo/promise/Promise
 * @class
 */
/**
 * @name successOrFailPromise#then
 * @param {function} onSuccess
 * @param {function} onError
 */
