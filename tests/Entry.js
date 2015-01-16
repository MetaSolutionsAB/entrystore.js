define([
    'store/EntryStore',
    'rdfjson/Graph',
    'tests/config'
], function(EntryStore, Graph, config) {
	//browsers have the global nodeunit already available

    var es = new EntryStore(config.repository);
    var c = es.getContextById("1");
    var ready;
    var dct = "http://purl.org/dc/terms/";

    return nodeunit.testCase({
        setUp: function(callback) {
            if (!ready) {
                es.auth({user: "Donald", password: "donalddonald"}).then(function() {
                    ready = true;
                    callback();
                });
            } else {
                callback();
            }
        },
        refresh: function(test) {
            c.newEntry().create().then(function(entry) {
                var graph = entry.getMetadata();
                graph.create(entry.getResourceURI(), dct+"title", {type: "literal", value:"Some title"});
                test.ok(!graph.isEmpty(), "Could not change the metadata graph.");
                entry.refresh(true, true).then(function() {
                    test.ok(entry.getMetadata().isEmpty(), "Could not refresh, unsaved changes in metadata graph remains.");
                    test.done();
                });
            });
        },
        createEntry: function(test) {
            c.newEntry().create().then(function(entry) {
                test.ok(entry.getId() != null, "Entry created but without id!");
                test.done();
            }, function() {
                test.ok(false, "Failed creating entry in context 1.");
                test.done();
            });
        },
        createWithMetadata: function(test) {
            var pe = c.newEntry();
            var uri = pe.getResourceURI();
            var graph = new Graph();
            graph.create(uri, dct+"title", {value: "Some title", type: "literal"});
            pe.setMetadata(graph);
            pe.create().then(function(entry) {
                var md = entry.getMetadata();
                test.ok(md.findFirstValue(entry.getResourceURI(), dct+"title") === "Some title", "Failed to create an entry with a title.");
                test.done();
            }, function() {
                test.ok(false, "Could not create an Entry in Context 1.");
                test.done();
            });
        },
        updateMetadata: function(test) {
            var pe = c.newEntry().create().then(function(entry) {
                entry.getMetadata(true).create(entry.getResourceURI(), dct+"title", {type: "literal", value:"Some title2"});
                entry.setMetadata().then(function() {
                    entry.getMetadata().findAndRemove();
                    test.ok(entry.getMetadata().findFirstValue(entry.getResourceURI(), dct+"title") == null, "Could not clear the RDF graph.");
                    entry.refresh(true, true).then(function() {
                        test.ok(entry.getMetadata().findFirstValue(entry.getResourceURI(), dct+"title") === "Some title2",
                            "Failed to create and update the metadata with a new title.");
                        test.done();
                    });
                }, function() {
                    test.ok(false, "Could not save metadata for new entry!");
                    test.done();
                });
            });
        },
        linkEntry: function(test) {
            var uri = "http://example.com/";
            c.newLink(uri).create().then(function(entry) {
                test.ok(entry.isLink(), "Failed to create a link.");
                test.ok(uri == entry.getResourceURI(), "Failed to set resourceURI during creation step.");
                test.done();
            }, function() {
                test.ok(false, "Failed to create link in Context 1.");
                test.done();
            });
        },
        linkRefEntry: function(test) {
            var uri = "http://example.com/";
            c.newLinkRef(uri, uri).create().then(function(entry) {
                test.ok(entry.isLinkReference(), "Failed to create a link-reference.");
                test.ok(uri == entry.getResourceURI(), "Failed to set resourceURI during creation step.");
                test.ok(uri == entry.getEntryInfo().getExternalMetadataURI(), "Failed to set external metadatat URI during creation step.");
                test.done();
            }, function() {
                test.ok(false, "Failed to create linkreference in Context 1.");
                test.done();
            });
        },

        refEntry: function(test) {
            var uri = "http://example.com/";
            c.newRef(uri, uri).create().then(function(entry) {
                test.ok(entry.isReference(), "Failed to create a reference.");
                test.ok(uri == entry.getResourceURI(), "Failed to set resourceURI during creation step.");
                test.ok(uri == entry.getEntryInfo().getExternalMetadataURI(), "Failed to set external metadatat URI during creation step.");
                test.done();
            }, function() {
                test.ok(false, "Failed to create a reference in Context 1.");
                test.done();
            });
        },
        listEntry: function(test) {
            c.newList().create().then(function(entry) {
                test.ok(entry.isList(), "Entry created, but it is not a list as expected.");
                test.done();
            }, function() {
                test.ok(false, "Failed to create a list in Context 1.");
                test.done();
            });
        },
        graphEntry: function(test) {
            var g = new Graph();
            g.create("http://example.com/", dct+"title", {type: "literal", value:"Some title1"});
            c.newGraph(g).create().then(function(entry) {
                test.ok(entry.isGraph(), "Entry created, but it is not a graph as expected.");
                entry.getResource().then(function(res) {
                    test.ok(res.getGraph().find().length === 1, "The created graph Entry does save the provided graph upon creation");
                    var g2 = new Graph();
                    res.setGraph(g2).commit().then(function() {
                        entry.setRefreshNeeded();
                        entry.refresh().then(function() {
                            test.ok(res.getGraph().isEmpty(), "Failed to update ")
                            test.done();
                        });
                    })
                    g2.create("http://example.com/", dct+"title", {type: "literal", value:"Some title2"});
                }, function(err) {
                    test.ok(false, "Failed to load resource graph for graph entry.");
                    test.done();
                });
            }, function() {
                test.ok(false, "Failed to create a graph in Context 1.");
                test.done();
            });
        },
        updateGraphEntry: function(test) {
            c.newGraph().create().then(function(entry) {
                entry.getResource().then(function(res) {
                    var g = new Graph();
                    g.create("http://example.com/", dct+"title", {type: "literal", value:"Some title"});
                    res.setGraph(g).commit().then(function() {
                        test.ok(res.getGraph().find(null, dct+"subject").length === 1, "Statement added after save missing, should be there until refresh.");
                        entry.setRefreshNeeded();
                        entry.refresh().then(function() {
                            test.ok(!res.getGraph().isEmpty(), "Failed to update graph of graph entry");
                            test.ok(res.getGraph().find(null, dct+"subject").length === 0, "Statement added after save operation remains, strange.");
                            test.done();
                        }, function(err) {
                            test.ok(false, "Failed refreshing: "+err);
                            test.done();
                        });
                    }, function(err) {
                        test.ok(false, "Failed to update resource of entry graph. "+err);
                        test.done();
                    });
                    g.create("http://example.com/", dct+"subject", {type: "literal", value:"not good if it remains in graph after update"});

                });
            }, function() {
                test.ok(false, "Failed to create a graph in Context 1.");
                test.done();
            });
        },
        stringEntry: function(test) {
            c.newString("one").create().then(function(entry) {
                test.ok(entry.isString(), "Entry created, but it is not a string as expected.");
                entry.getResource().then(function(res) {
                    test.ok(res.getString() === "one", "The created string entry does not have the string provided upon creation.");
                    test.done();
                });
            }, function() {
                test.ok(false, "Failed to create a string entry in Context 1.");
                test.done();
            });
        },
        updateStringEntry: function(test) {
            var str = "a string";
            c.newString().create().then(function(entry) {
                entry.getResource().then(function(res) {
                    test.ok(res.getString() === "", "Empty string instead of null");
                    res.setString(str).commit().then(function() {
                        test.ok(res.getString() === str, "String is not set correctly");
                        res.setString("").commit().then(function() {
                            entry.setRefreshNeeded();
                            entry.refresh().then(function() {
                                console.log("String is: "+res.getString());
                                test.ok(res.getString() === "", "Reload from repository gave wrong string");
                                test.done();
                            }, function(err) {
                                test.ok(false, "Failed refreshing: "+err);
                                test.done();
                            });
                        });
                    }, function(err) {
                        test.ok(false, "Failed to update resource of string entry. "+err);
                        test.done();
                    });
                });
            }, function() {
                test.ok(false, "Failed to create a string entry in Context 1.");
                test.done();
            });
        },
        createWithCachedExternalMetadata: function(test) {
            var uri = "http://example.com/";
            var graph = new Graph();
            graph.create(uri, dct+"title", {value: "Some title", type: "literal"});
            c.newLinkRef(uri, uri).setCachedExternalMetadata(graph).create().then(function(entry) {
                test.ok(!entry.getCachedExternalMetadata().isEmpty(), "Failed to set cached external metadata in creation step.");
                test.done();
            }, function() {
                test.ok(false, "Failed to create Entry with cached external metadata in Context 1.");
                test.done();
            });
        },


        updateCachedExternalMetadata: function(test) {
            var uri = "http://example.com/";
            c.newRef(uri, uri).create().then(function(entry) {
                var cemd = entry.getCachedExternalMetadata();
                test.ok(cemd.isEmpty(), "New Link entry has non-empty cached external metadata, strange.");
                cemd.create(entry.getResourceURI(), dct+"title", {value: "A title", type: "literal"});
                return entry.setCachedExternalMetadata().then(function() {
                    test.ok(!cemd.isEmpty(), "Failed to save cached external metadata.");
                    test.done();
                }, function() {
                    test.ok(false, "Something went wrong updating cachedExternalMetadata.");
                    test.done();
                });
            });
        }
    });
});
