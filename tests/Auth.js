define(['store/EntryStore', 'tests/config'], function(EntryStore, config) {
	//browsers have the global nodeunit already available

    var es = new EntryStore(config.repository);
    var auth = es.getAuth();

	return nodeunit.testCase({ inGroups: true,
        authorize: {
            cookieSignIn: function(test) {
                test.expect(1);
                auth.login("Donald", "donalddonald").then(function(data) {
                    test.ok(data.user === "Donald");
                    test.done();
                }, function() {
                    test.ok(false, "Could not authenticate user Donald with password donalddonald");
                    test.done();
                });
            },
            cookieSignOut: function(test) {
                test.expect(1);
                auth.login("Donald", "donalddonald").then(function() {
                    return auth.logout().then(function(data) {
                        test.ok(data.user === "guest", "Failed sign out from account Donald.");
                        test.done();
                    });
                }, function() {
                    test.ok(false, "Could not de-authenticate user Donald.");
                    test.done();
                });
            }
        },
        fromGuestListeners: {
            setUp: function (callback) {
                auth.logout().then(function() {
                    callback();
                });
            },
            login: function (test) {
                test.expect(1);
                var f = function (topic, data) {
                    if (topic === "login") {
                        test.ok(data.user === "Donald");
                        test.done();
                        auth.removeAuthListener(f);
                    }
                };
                auth.addAuthListener(f);
                auth.login("Donald", "donalddonald");
            },
            guestUserEntry: function(test) {
                test.expect(1);
                auth.getUserEntry().then(function(entry) {
                    var name = entry.getResource(true).getName();
                    test.ok(name === "guest");
                    test.done();
                });
            }
        },
        fromUserListeners: {
            setUp: function (callback) {
                auth.login("Donald", "donalddonald").then(function() {
                    callback();
                });
            },
            logout: function(test) {
                test.expect(1);
                var f = function(topic, data) {
                    if (topic === "logout") {
                        test.ok(data.user === "guest");
                        test.done();
                        auth.removeAuthListener(f);
                    }
                };
                auth.addAuthListener(f);
                auth.logout();
            },
            signedInUserEntry: function(test) {
                test.expect(1);
                auth.getUserEntry().then(function(entry) {
                    test.ok(entry.getResource(true).getName() === "Donald");
                    test.done();
                });
            }
        }
    });
});