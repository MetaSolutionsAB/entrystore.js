import Cache from './Cache.js';


const cachedentry = {
  getURI() {
    return 'http://example.com/1/entry/1';
  },
  getResourceURI() {
    return 'http://example.com/1/resource/1';
  },
};


test('Initialize cache', () => {
  const cache = new Cache();
  expect(cache).not.toBeNull();
});

test('Check cached entry', () => {
  const cache = new Cache();
  cache.cache(cachedentry);
  expect(cache.get(cachedentry.getURI())).toBe(cachedentry); // If fail: Failed to retrieve cached entry.');
});

test('Invalidate cache', () => {
  expect.assertions(1);
  const cache = new Cache();
  cache.cache(cachedentry);
  cache.addCacheUpdateListener((event) => {
    expect(event).toBe('allEntriesNeedRefresh');
  });
  cache.allNeedRefresh();
});


