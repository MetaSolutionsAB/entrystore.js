define([], function() {

  const Cache = EntryStore.Cache;

  var e1 = {
    getURI: function() {return "http://example.com/1/entry/1"},
    getResourceURI: function() {return "http://example.com/1/resource/1"}
  };

  return nodeunit.testCase({
    initCache: function(test) {
      var c = new Cache();
      test.ok(c != null);
      test.done();
    },
    basicCacheFunctionlity: function(test) {
      var c = new Cache();
      c.cache(e1);
      test.ok(c.get(e1.getURI()) === e1, "Failed to retrieve cached entry.");
      test.done();
    },
    invalidateCache: function(test) {
      var c = new Cache();
      c.cache(e1);
      c.addCacheUpdateListener(function(event, entry) {
        test.ok(event==="allEntriesNeedRefresh");
        test.done();
      });
      c.allNeedRefresh();
    },
    listeners: function(test) {
      var c = new Cache();
      c.cache(e1);
      c.addCacheUpdateListener(function(event, entry) {
        test.ok(event==="allEntriesNeedRefresh");
        test.done();
      });
      c.allNeedRefresh();
    }
  })
});
