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
    var now = new Date();
    var yesterday = (new Date()).setDate(now.getDate() - 1);
    var tomorrow = (new Date()).setDate(now.getDate() + 1);

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
        dates: function(test) {
            c.newEntry().create().then(function(entry) {
                var ei = entry.getEntryInfo();
                var cr = ei.getCreationDate();
                test.ok(cr > yesterday && cr < tomorrow, "Creation date seems to be incorrect.");
                var mo = ei.getModificationDate();
                test.ok(mo > yesterday && mo < tomorrow, "Modification date seems to be incorrect");
                test.ok(mo >= cr, "Modification date should be same as creation date after first creation.");
                entry.setMetadata(new Graph({"http://example.com": {"http://purl.org/dc/terms/title": [{value: "A title", type: "literal"}]}}))
                    .commitMetadata().then(function() {
                        test.ok(ei.getModificationDate() > mo, "Modification date not changed after metadata was updated.");
                        test.done();
                    });
            });
        },
        creator: function(test) {
            es.getUserEntry().then(function(user) {
                c.newEntry().create().then(function(entry) {
                    var ei = entry.getEntryInfo();
                    test.ok(ei.getCreator() === user.getResourceURI(), "Creator does not match current user.");
                    test.done();
                });
            });
        },
        contributors: function(test) {
            es.getUserEntry().then(function(user) {
                c.newEntry().create().then(function(entry) {
                    var contr = entry.getEntryInfo().getContributors();
                    test.ok(contr.length ===  1 && contr[0] === user.getResourceURI(), "No contributors.");
                    test.done();
                });
            });
        },
        acl: function(test) {
            c.newEntry().commit().then(function(entry) {
                var ei = entry.getEntryInfo();
                test.ok(!ei.hasACL(), "ACL present on created entry when no ACL was provided.");
                var acl = {admin: [es.getEntryURI("_principals", "admin")]};
                ei.setACL(acl);
                test.ok(ei.hasACL(), "No ACL present although it was just set.");
                ei.commit().then(function() {
                    var acl = ei.getACL();
                    test.ok(acl.admin.length === 1, "ACL failed to save.");
                    test.ok(acl.rread.length === 0, "Local modifications of ACL after save operation remains.");
                    test.done();
                }, function(err) {
                    test.ok(false, "Failed updating ACL. "+err);
                    test.done();
                });
                acl.rread = [es.getEntryURI("_principals", "admin")];
                ei.setACL(acl); //Make a local modification.
            });
        },
        createWithACL: function(test) {
            var acl = {admin: [es.getEntryURI("_principals", "admin")]};
            c.newEntry().setACL(acl).create().then(function(entry) {
                test.ok(entry.getEntryInfo().hasACL(), "No ACL present although it was provided on create.");
                test.done();
            });
        },
        changeResourceURI: function(test) {
            var uri = "http://example.com";
            var uri2 = uri + "/about";
            c.newLink(uri).create().then(function(entry) {
                var ei = entry.getEntryInfo();
                ei.setResourceURI(uri2);
                test.ok(uri2 === ei.getResourceURI(), "Failed to set new URI");
                ei.commit().then(function() {
                    test.ok(ei.getResourceURI() === uri2, "Failed to save new URI, local change remains.");
                    test.done();
                });
                ei.setResourceURI(uri); //Resetting old uri, local change that should be reset after save.
            });
        },
        changeExternalMetadataURI: function(test) {
            var res = "http://slashdot.org";
            var mduri = "http://example.com";
            var mduri2 = mduri + "/about";
            c.newRef(res, mduri).create().then(function(entry) {
                var ei = entry.getEntryInfo();
                ei.setExternalMetadataURI(mduri2);
                test.ok(ei.getExternalMetadataURI() === mduri2, "Failed to set new external metadata URI");
                ei.commit().then(function() {
                    test.ok(ei.getExternalMetadataURI() === mduri2, "Failed to save new URI, local change remains.");
                    test.done();
                });
                ei.setExternalMetadataURI(mduri); //Resetting old uri, local change that should be reset after save.
            });
        }
    });
});
