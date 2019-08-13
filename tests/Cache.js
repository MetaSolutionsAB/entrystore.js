const store = require('../dist/entrystore.node');

const Cache = store.Cache;

const e1 = {
  getURI() {
    return 'http://example.com/1/entry/1';
  },
  getResourceURI() {
    return 'http://example.com/1/resource/1';
  },
};

exports.Cache = {
  initCache(test) {
    const cache = new Cache();
    test.ok(cache != null);
    test.done();
  },
  basicCacheFunctionality(test) {
    const cache = new Cache();
    cache.cache(e1);
    test.ok(cache.get(e1.getURI()) === e1, 'Failed to retrieve cached entry.');
    test.done();
  },
  invalidateCache(test) {
    const cache = new Cache();
    cache.cache(e1);
    cache.addCacheUpdateListener((event) => {
      test.ok(event === 'allEntriesNeedRefresh');
      test.done();
    });
    cache.allNeedRefresh();
  },
  listeners(test) {
    const cache = new Cache();
    cache.cache(e1);
    cache.addCacheUpdateListener((event) => {
      test.ok(event === 'allEntriesNeedRefresh');
      test.done();
    });
    cache.allNeedRefresh();
  },
};
