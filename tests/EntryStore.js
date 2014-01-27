define(['rdfjson/Graph', 'store/EntryStore'], function(Graph, EntryStore) {
	//browsers have the global nodeunit already available
	return nodeunit.testCase({
		initStore: function(test) {
			var es = new EntryStore("http://localhost:8080/store/");
			es.getEntry("http://localhost:8080/store/1/entry/5").then(function(entry) {
				test.ok(entry != null);
				test.done();
			}, function(err) {
				test.ok(false, err);
				test.done();
			})
  		}
	})
});