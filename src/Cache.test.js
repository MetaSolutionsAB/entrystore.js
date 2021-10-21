//const store = require('../dist/entrystore.node');

//const Cache = store.Cache;

import Cache from './Cache';


const e1 = {
  getURI() {
    return 'http://example.com/1/entry/1';
  },
  getResourceURI() {
    return 'http://example.com/1/resource/1';
  },
};


test('Initialize cache',  () => {
    const cache = new Cache();
    expect(cache).not.toBeNull();
});

test('Check cached entry',  () => {
    const cache = new Cache();
    cache.cache(e1);
    expect(cache.get(e1.getURI())).toBe(e1); // If fail: Failed to retrieve cached entry.');
});

test('Invalidate cache', () => {
    expect.assertions(1);
    const cache = new Cache();
    cache.cache(e1);
    cache.addCacheUpdateListener((event) => {
        expect(event).toBe('allEntriesNeedRefresh');
    });
    cache.allNeedRefresh();
});


