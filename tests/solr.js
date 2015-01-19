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
                es.auth({user: "admin", password: "adminadmin"}).then(function() {
                    ready = true;
                    callback();
                });
            } else {
                callback();
            }
        },
        titleSearch: function(test) {
            es.createSearchList(solr.title("Donald")).getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0, "No entries found for title 'Donald', despite that we are searching against disney suite.");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        listSearch: function(test) {
            es.createSearchList(solr.graphType(types.GT_LIST)).getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0 && entries[0].isList(), "No lists found, or entry found was not a list");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        userSearch: function(test) {
            es.createSearchList(solr.graphType(types.GT_USER)).getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0 && entries[0].isUser(), "No users found, or entry found was not a user");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        userAndTitleSearch: function(test) {
            es.createSearchList(solr.graphType(types.GT_USER).title("Donald")).getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0 && entries[0].isUser(), "No users found, or entry found was not a user");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        contextSearch: function(test) {
            es.createSearchList(solr.graphType(types.GT_CONTEXT)).getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0 && entries[0].isContext(), "No context found, or entry found was not a context");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
        linkSearch: function(test) {
            es.createSearchList(solr.entryType(types.ET_LINK)).getEntries(0).then(function(entries) {
                    test.ok(entries.length > 0 && entries[0].isLink(), "No link found, or entry found was not a link");
                    test.done();
                }, function() {
                    test.ok(false, "Failed performing the search, REST call went wrong.");
                }
            );
        },
    });
});