define([
    'store/EntryStore',
    'store/terms',
    'rdfjson/Graph',
    'tests/config',
    "dojo/date/stamp"
], function(EntryStore, terms, Graph, config, stamp) {
	//browsers have the global nodeunit already available

    var es = new EntryStore(config.repository);
    var ready;
    var dct = "http://purl.org/dc/terms/";
    var authAdminReady = false;

    return nodeunit.testCase({
      setUp: function(callback) {
        if (!authAdminReady) {
          es.getAuth().login("admin", "adminadmin").then(function() {
            authAdminReady = true;
            callback();
          });
        } else {
          callback();
        }
      },
      inferredMetadata: function(test) {
        es.newContext().commit().then(function(contextEntry) {
          var ei = contextEntry.getEntryInfo();
          ei.getGraph().addD(contextEntry.getResourceURI(),
            terms.reasoningFacts, 'true', 'xsd:boolean');
          return ei.commit().then(function() {
            var context = contextEntry.getResource(true);
            return context.newEntry().add('skos:broader', 'http://example.com').commit()
              .then(function (conceptEntry) {
                return es.newContext().commit().then(function (contextEntry2) {
                  var context2 = contextEntry2.getResource(true);
                  return context2.newEntry().add('dcterms:subject', conceptEntry.getResourceURI())
                    .commit().then(function (inferredEntry) {
                      var im = inferredEntry.getInferredMetadata();
                      test.ok(im != null, 'No inferred metadata created.');
                      if (im != null) {
                        test.ok(im.findFirstValue(null, 'dcterms:subject') === 'http://example.com',
                        'Inferred metadata does not contain expected tripple.');
                      }
                      test.done();
                    });
                });
              });
          });
        }).then(null, function(err) {
          test.ok(false, 'Error in test setup for inferred metadata: ' + err.message);
          test.done();
        });
      },
    });
});
