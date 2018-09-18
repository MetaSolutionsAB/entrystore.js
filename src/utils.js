
const utils = {};

utils.getRelatedToEntryURIs = (fromEntry) => {
  const es = fromEntry.getEntryStore();
  const base = fromEntry.getEntryStore().getBaseURI();
  const relatedEntryURIs = [];
  fromEntry.getMetadata().find().forEach((stmt) => {
    if (stmt.getType() === 'uri') {
      const obj = stmt.getValue();
      if (obj.indexOf(base) === 0) {
        const uri = es.getEntryURI(es.getContextId(obj), es.getEntryId(obj));
        relatedEntryURIs.push(uri);
      }
    }
  });
  return relatedEntryURIs;
};

utils.getRelatedToEntries = (fromEntry) => {
  const es = fromEntry.getEntryStore();
  return Promise.all(utils.getRelatedToEntryURIs(fromEntry).map(uri => es.getEntry(uri)));
};

utils.remove = (entry) => {
  const es = entry.getEntryStore();
  const cache = es.getCache();
  const refStmts = entry.getReferrersGraph().find();
  const entryPromises = refStmts.map((stmt) => {
    const subj = stmt.getSubject();
    const euri = es.getEntryURI(es.getContextId(subj), es.getEntryId(subj));
    return es.getEntry(euri);
  });
  return entry.del().then(() => Promise.all(entryPromises).then((arr) => {
    const promises = refStmts.map((stmt, idx) => {
      const md = arr[idx].getMetadata();
      md.remove(stmt);
      return arr[idx].commitMetadata();
    });
    const uris = utils.getRelatedToEntryURIs(entry);
    uris.forEach((uri) => {
      const e = cache.get(uri);
      if (e != null) {
        e.setRefreshNeeded();
        promises.push(e.refresh());
      }
    });
    return Promise.all(promises);
  }));
};

utils.addRelation = (fromEntry, property, toEntry) => {
  fromEntry.getMetadata().add(fromEntry.getResourceURI(), property, toEntry.getResourceURI());
  return fromEntry.commitMetadata().then(() => {
    toEntry.setRefreshNeeded();
    return toEntry.refresh();
  });
};

utils.removeRelation = (fromEntry, property, toEntry) => {
  fromEntry.getMetadata().remove(fromEntry.getResourceURI(), property, { type: 'uri', value: toEntry.getResourceURI() });
  return fromEntry.commitMetadata().then(() => {
    toEntry.setRefreshNeeded();
    return toEntry.refresh();
  });
};

// Relies on there not being a window.document in Node
// Based off of: https://github.com/flexdinesh/browser-or-node/blob/master/src/index.js
const isBrowser = () => typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isNode = () => typeof module !== 'undefined' && typeof module.exports !== 'undefined';
const isIE = () => window && window.navigator.userAgent.match(/MSIE/) !== null;

export { utils, isBrowser, isNode, isIE };
export default utils;
