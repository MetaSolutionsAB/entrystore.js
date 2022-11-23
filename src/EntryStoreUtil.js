const getContextURI = (es, c) => {
  if (c && c.getResourceURI) {
    return c.getResourceURI();
  } else if (typeof c === 'string' && c !== '') {
    if (c.indexOf('http') === 0) {
      return c;
    } else {
      return es.getContextById(c).getResourceURI();
    }
  }
};

const contextEquals = (es, c1, c2) => getContextURI(es, c1) === getContextURI(es, c2);

const promiseInScope = (es, promise, c2) => getContextURI(es, promise.__context) === getContextURI(es, c2);
const markPromise = (es, promise, context) => {
  const curi = getContextURI(es, context);
  if (curi) {
    promise.__context = curi;
  }
};

/**
 * EntryStoreUtil provides utility functionality for working with entries.
 * @exports store/EntryStoreUtil
 */
export default class EntryStoreUtil {
  /**
   * @param {EntryStore} entrystore
   */
  constructor(entrystore) {
    this._entrystore = entrystore;
    this._preloadIdx = new Map();
    this._publicRead = false;
  }

  /**
   * When loading entries via solr queries restrict to those marked as public.
   * Corresponds to calling publicRead on all solr queries used internally in these help functions.
   * @param {boolean} publicRead
   */
  loadOnlyPublicEntries(publicRead) {
    this._publicRead = publicRead;
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
    if (this._publicRead) {
      searchObj.publicRead(true);
    }
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
    return this.loadEntriesByResourceURIs([resourceURI], context, false, asyncCallType)
      .then(arr => arr[0]);
/*    const cache = this._entrystore.getCache();
    const entriesSet = cache.getByResourceURI(resourceURI);
    if (entriesSet.size > 0) {
      if (context) {
        for (const entry of entriesSet) { // eslint-disable-line
          if (entry.getContext().getId() === context.getId()) {
            return Promise.resolve(entry);
          }
        }
      } else {
        return Promise.resolve(entriesSet.values().next().value);
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
    throw new Error(`No entries for resource with URI: ${resourceURI}`);*/
  }

  /**
   * @param {string} resourceURI is the URI for the resource.
   * @returns {Entry}
   */
  getEntryListByResourceURI(resourceURI) {
    const query = this._entrystore.newSolrQuery().resource(resourceURI);
    if (this._publicRead) {
      query.publicRead(true);
    }
    return query.list();
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
    if (this._publicRead) {
      query.publicRead(true);
    }
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
    if (this._publicRead) {
      query.publicRead(true);
    }
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
   * @returns {Promise<String[]>} array of uris that where deleted
   */
  async removeAll(list) {
    const uris = [];
    const deleted = [];
    const es = this._entrystore;
    const cache = es.getCache();
    const rest = es.getREST();

    const deleteNext = async () => {
      if (uris.length > 0) {
        const uri = uris.pop();
        try {
          await rest.del(uri);
          deleted.push(uri);
        } catch (err) {
          console.log(`Could not remove entry with uri: ${uri} continuing anyway.`);
        }
        await deleteNext();
      }
      return undefined;
    };

    const result = await list.forEach((entry) => {
      uris.push(entry.getURI());
      cache.unCache(entry);
    });

    await deleteNext(result);
    return deleted;
  }

  /**
   * Loads entries by first checking if they are in the cache, second if there are ongoing loading attempts that
   * can be waited on and lastly loads them itself by via a solr query. Note, if too many entries are asked for at
   * once the solr query will be divided into smaller chunks.
   *
   * @param {Array<String>} resourceURIs array of resourceURIs to load.
   * @param {Context=} context only look for entries in this context, may be left out.
   * @param {boolean} acceptMissing if true then the array returned may contain holes
   * @param {string} asyncCallType the callType used when making the search.
   * @returns {Promise<Entry[]>}
   */
  async loadEntriesByResourceURIs(resourceURIs, context, acceptMissing = false, asyncCallType) {
    const es = this._entrystore;
    const cache = es.getCache();
    const id2Entry = {};
    const previouslyLoadingPromises = [];
    const toLoad = [];
    resourceURIs.forEach((uri) => {
      let entries = Array.from(cache.getByResourceURI(uri).values());
      if (context) {
        entries = entries.filter(e => e.getContext().getResourceURI() === getContextURI(es, context));
      }
      if (entries.length > 0) {
        id2Entry[uri] = entries[0];
      } else {
        const loadpromise = cache.getPromise(uri);
        if (loadpromise && promiseInScope(es, loadpromise, context)) {
          previouslyLoadingPromises.push(loadpromise.then((entry) => {
            id2Entry[uri] = entry;
          }, (e) => {
            if (!acceptMissing) {
              throw e;
            }
          }));
        } else {
          toLoad.push(uri);
        }
      }
    });

    const chunked = [];
    const chunkLimit = 20;
    for (let i = 0; i < toLoad.length; i += chunkLimit) {
      chunked.push(toLoad.slice(i, i + chunkLimit));
    }
    const chunkLoadingPromises = chunked.map((chunk) => {
      const uri2resolve = {};
      const uri2reject = {};
      chunk.forEach((ruri) => {
        const p = new Promise((resolve, reject) => {
          uri2resolve[ruri] = resolve;
          uri2reject[ruri] = reject;
        });
        markPromise(es, p, context);
        cache.addPromise(ruri, p);
      });
      const loadEntries = new Set(chunk);
      const query = es.newSolrQuery();
      if (this._publicRead) {
        query.publicRead(true);
      }
      return query.resource(chunk).context(context).list(asyncCallType).forEach((entry) => {
        const ruri = entry.getResourceURI();
        if (loadEntries.has(ruri)) {
          loadEntries.delete(ruri);
          uri2resolve[ruri](entry);
          id2Entry[ruri] = entry;
          cache.removePromise(ruri);
        }
        return loadEntries.size !== 0;
      }).then(() => {
        if (loadEntries.size > 0) {
          loadEntries.forEach((ruri) => {
            uri2reject[ruri](new Error(`No resource found for ${ruri}`));
            cache.removePromise(ruri);
          });
          if (!acceptMissing) {
            throw new Error(`The following resources could not be found ${Array.from(loadEntries).join(', ')}`);
          }
        }
      });
    });
    return Promise.all(previouslyLoadingPromises.concat(chunkLoadingPromises))
      .then(() => resourceURIs.map(ruri => id2Entry[ruri] || null));
  }
}
