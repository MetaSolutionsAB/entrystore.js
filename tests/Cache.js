define(['tests/config'], function(config) {

  const es = new EntryStore(config.repository);

	var e1 = {
		getURI: function() {return "http://example.com/1/entry/1"},
		getResourceURI: function() {return "http://example.com/1/resource/1"}
	};
	
	return nodeunit.testCase({
		initCache: function(test) {
			//var c = new Cache();
      var c = es.getCache();
			test.ok(c != null);
			test.done();
  		},
  		basicCacheFunctionlity: function(test) {
			//var c = new Cache();
      var c = es.getCache();
  			c.cache(e1);
			test.ok(c.get(e1.getURI()) === e1, "Failed to retrieve cached entry.");
			test.done();
  		},
  		invalidateCache: function(test) {
			//var c = new Cache();
      var c = es.getCache();
  			c.cache(e1);
  			c.addCacheUpdateListener(function(event, entry) {
  				test.ok(event==="allEntriesNeedRefresh");
	  			test.done();
  			});
  			c.allNeedRefresh();
  		},
  		listeners: function(test) {
			//var c = new Cache();
      var c = es.getCache();
  			c.cache(e1);
  			c.addCacheUpdateListener(function(event, entry) {
  				test.ok(event==="allEntriesNeedRefresh");
	  			test.done();
  			});
  			c.allNeedRefresh();
  		}
	})
});
