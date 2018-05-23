import { EntryStore } from '../';
import config from './config';
const Graph = require('rdfjson/Graph');

    var es = new EntryStore(config.repository);
    var c = es.getContextById("1");
    var ready;
    var dct = "http://purl.org/dc/terms/";
    var lst, e1, e2;

    export default nodeunit.testCase({
        setUp: function(callback) {
            if (!ready) {
                es.auth({user: "Donald", password: "donalddonald"}).then(function() {
                    c.newList().create().then(function(listentry) {
                        lst = listentry;
                        c.newEntry().setParentList(lst).create().then(function(entry1) {
                            e1 = entry1;
                            c.newEntry().setParentList(lst).create().then(function(entry2) {
                                e2 = entry2;
                                ready = true;
                                callback();
                            });
                        });
                    });
                });
            } else {
                callback();
            }
        },

        members: function(test) {
            var resource = lst.getResource(true);
            resource.getEntries().then(function(entries) {
                test.ok(entries.length >= 2, "List have to few children");
                test.done();
            });
        },

        addMember: function(test) {
            c.newEntry().create().then(function(entry) {
                var lres = lst.getResource(true);
                test.ok(entry.getParentLists().length === 0, "New entry should not belong to a parentList unless explicitly specified.");
                test.ok(!entry.needRefresh(), "New entry should not be in need of a refresh.");
                lres.addEntry(entry).then(function() {
                    lres.getEntries().then(function(entries) {
                        test.ok(entries.indexOf(entry) >= 0, "Entry not contained in list, list not refreshed.");
                        test.done();
                    });
                });
            });
        },

        addMemberOnCreate: function(test) {
            c.newEntry().setParentList(lst).create().then(function(entry) {
                lst.getResource(true).getEntries().then(function(entries) {
                    test.ok(entries.indexOf(entry) >= 0, "Entry not contained in list, list not refreshed or entry not added to list.");
                    test.done();
                });
            });
        },

        removeMember: function(test) {
            c.newEntry().setParentList(lst).create().then(function(entry) {
                var lres = lst.getResource(true);
                test.ok(entry.getParentLists().length === 1, "New entry should belong to the specified parentList provided upon creation.");
                test.ok(!entry.needRefresh(), "New entry should not be in need of a refresh.");
                lres.getEntries().then(function(entries) {
                    test.ok(entries.indexOf(entry) >= 0, "Entry not contained in list, list not refreshed.");
                    lres.removeEntry(entry).then(function() {
                        test.ok(entry.needRefresh(), "Entry is removed from a list and should be in need of a refresh!");
                        lres.getEntries().then(function(entries2) {
                            test.ok(entries2.indexOf(entry) == -1, "Entry not removed from list, either list not refreshed or entry not removed from list.");
                            test.done();
                        })
                    });
                });
            });
        }
    });
