define(['store/EntryStore', 'tests/config'], function(EntryStore, config) {
	//browsers have the global nodeunit already available

    var es = new EntryStore(config.repository);
    var authAdminReady;

	return nodeunit.testCase({ inGroups: true,
        withoutLogin: {
            setUp: function(callback) {
                es.getAuth().logout().then(function() {
                    callback();
                });
            },
            initStore: function(test) {
                test.ok(es.getBaseURI() === config.repository);
                test.done();
            },
            getEntry: function(test) {
                es.getEntry(config.repository+"1/entry/1").then(function(entry) {
                    test.ok(entry != null);
                    test.done();
                }, function(err) {
                    test.ok(false, err);
                    test.done();
                })
            },
            getContext: function(test) {
                var c = es.getContextById("1");
                test.ok(c.getId() === "1");
                test.done();
            },
            getContextList: function(test) {
                var clist = es.getContextList();
                clist.getEntries().then(function(entries) {
                    test.ok(entries == null || entries.length === 0, "List of contexts should only be visible to admin.");
                    test.done();
                }, function() {
                    test.ok(true);
                    test.done();
                });
            },
            getPrincipalList: function(test) {
                var plist = es.getPrincipalList();
                plist.getEntries().then(function(entries) {
                    test.ok(entries == null || entries.length === 0, "List of principals should only be visible to admin.");
                    test.done();
                }, function() {
                    test.ok(true);
                    test.done();
                });
            }
        },
        withAdminLogin: {
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
            asyncListenerLogout: function(test) {
                var al = function(promise, callType) {
                    test.ok(callType === "logout", "Wrong calltype, should be 'logout'");
                    promise.then(function() {
                        authAdminReady = false;
                        test.done();
                    }, function() {
                        test.done();
                    });
                };
                es.addAsyncListener(al);
                es.getAuth().logout();
                es.removeAsyncListener(al);
            },
            getContextList: function(test) {
                var clist = es.getContextList();
                clist.getEntries().then(function(entries) {
                    test.ok(entries.length > 0, "No contexts found.");
                    test.done();
                }, function() {
                    test.ok(false, "Failed loading of contexts.");
                    test.done();
                });
            },
            getPrincipalList: function(test) {
                var plist = es.getPrincipalList();
                plist.getEntries().then(function(entries) {
                    test.ok(entries.length > 0, "No principals found");
                    test.done();
                }, function() {
                    test.ok(false, "Failed loading principalList.");
                    test.done();
                });
            },
            createContext: function(test) {
                es.newContext().commit().then(function(entry) {
                    test.ok(entry.isContext(), "Entry created, but it is not a context");
                    test.done();
                }, function() {
                    test.ok(false, "Failed creating context.");
                    test.done();
                });
            },
            createUser: function(test) {
                var username = ""+new Date().getTime();
                es.newUser(username).commit().then(function(entry) {
                    test.ok(entry.isUser(), "Entry created, but it is not a user!");
                    test.ok(entry.getResource(true).getName() === username, "User created, but username provided in creation step is missing.");
                    test.done();
                }, function() {
                    test.ok(false, "Failed creating user.");
                    test.done();
                });
            },
            createGroup: function(test) {
                es.newGroup().commit().then(function(entry) {
                    test.ok(entry.isGroup(), "Entry created, but it is not a group!");
                    test.done();
                }, function() {
                    test.ok(false, "Failed creating group.");
                    test.done();
                });
            }
        }
    });
});