define(['store/EntryStore', 'tests/config'], function(EntryStore, config) {
	//browsers have the global nodeunit already available
	return nodeunit.testCase({
		initStore: function(test) {
			var es = new EntryStore(config.repository);
			es.getEntry(config.repository+"1/entry/1").then(function(entry) {
				test.ok(entry != null);
				test.done();
			}, function(err) {
				test.ok(false, err);
				test.done();
			})
  		}
	})
});