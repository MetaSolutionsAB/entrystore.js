const config = require('./config');
const store = require('../dist/EntryStore.node');

const { repository } = config;
new store.EntryStore(repository); // needed?
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
    const c = new Cache();
    test.ok(c != null);
    test.done();
  },
  basicCacheFunctionality(test) {
    const c = new Cache();
    c.cache(e1);
    test.ok(c.get(e1.getURI()) === e1, 'Failed to retrieve cached entry.');
    test.done();
  },
  invalidateCache(test) {
    const c = new Cache();
    c.cache(e1);
    c.addCacheUpdateListener((event) => {
      test.ok(event === 'allEntriesNeedRefresh');
      test.done();
    });
    c.allNeedRefresh();
  },
  listeners(test) {
    const c = new Cache();
    c.cache(e1);
    c.addCacheUpdateListener((event) => {
      test.ok(event === 'allEntriesNeedRefresh');
      test.done();
    });
    c.allNeedRefresh();
  },
};
