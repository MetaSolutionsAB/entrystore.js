define([
    'store/EntryStore',
    'rdfjson/Graph',
    'store/solr',
    'store/types',
    'tests/config'
], function(EntryStore, Graph, solr, types, config) {
	//browsers have the global nodeunit already available

    var es = new EntryStore(config.repository);
    var c = es.getContextById("1");
    var ready;
    var dct = "http://purl.org/dc/terms/";

    return nodeunit.testCase({
        setUp: function(callback) {
            if (!ready) {
                es.getAuth().login("admin", "adminadmin").then(function() {
                    ready = true;
                    callback();
                });
            } else {
                callback();
            }
        },
        titleSearch: function(test) {
            es.newSolrQuery().title("Donald").list().getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0, "No entries found for title 'Donald', despite that we are searching against disney suite.");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        listSearch: function(test) {
            es.newSolrQuery().graphType(types.GT_LIST).list().getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0 && entries[0].isList(), "No lists found, or entry found was not a list");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        userSearch: function(test) {
            es.newSolrQuery().graphType(types.GT_USER).list().getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0 && entries[0].isUser(), "No users found, or entry found was not a user");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        userAndTitleSearch: function(test) {
            es.newSolrQuery().graphType(types.GT_USER).title("Donald").list().getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0 && entries[0].isUser(), "No users found, or entry found was not a user");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        contextSearch: function(test) {
            es.newSolrQuery().graphType(types.GT_CONTEXT).list().getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0 && entries[0].isContext(), "No context found, or entry found was not a context");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        linkSearch: function(test) {
            es.newSolrQuery().entryType(types.ET_LINK).list().getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0 && entries[0].isLink(), "No link found, or entry found was not a link");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        literalPropertySearch: function(test) {
            es.newSolrQuery()
                .literalProperty("dcterms:title", "Donald")
                .list().getEntries(0)
                .then(function(entries) {
                    test.ok(entries.length > 0, "Cannot find title Donald via property search.");
                    test.done();
                }, function(err) {
                    test.ok(false, "Failed performing the search, REST call went wrong: "+err);
                    test.done();
                });
        },
        forEachSearch: function(test) {
            var callbackCount = 0, endReached = false;
            es.newSolrQuery().graphType(types.GT_USER).limit(2).list().forEach(function(userEntry, idx) {
                if (endReached) {
                    test.ok(false, "End function called before all callbacks.")
                }
                test.ok(callbackCount === idx, "Callback index is wrong.")
                callbackCount++;
            }).then(function(totalCount) {
                endReached = true;
                test.ok(callbackCount === totalCount, "Total count does not agree with amount of callbacks.");
                test.done();
            }, function(err) {
                test.ok(false, "Got error callback from promise unexpectedly: "+err);
                test.done();
            });
        },
        forEachSearchBreak: function(test) {
            es.newSolrQuery().graphType(types.GT_USER).limit(2).list().forEach(function(userEntry, index) {
                test.ok(index < 3, "Callbacks continues after attempt to break.");
                return index !== 2;
            }).then(function(totalCount) {
                test.ok(totalCount === 3, "Total count is wrong, should be 3 as we stopped iteration after entry 3.");
                test.done();
            }, function(err) {
                test.ok(false, "Got error callback from promise unexpectedly: "+err);
                test.done();
            });
        }
    });
});