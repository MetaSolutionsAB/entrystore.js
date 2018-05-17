define(['tests/config'], function(config) {
	//browsers have the global nodeunit already available

    var es = new EntryStore(config.repository);
    var auth = es.getAuth();

	return nodeunit.testCase({ inGroups: true,
        authorize: {
            cookieSignIn: function(test) {
                test.expect(1);
                auth.login("test@metasolutions.se", "testtest").then(function(data) {
                    test.ok(data.user === "donald");
                    test.done();
                }, function() {
                    test.ok(false, "Could not authenticate test user with password testtest");
                    test.done();
                });
            },
            cookieSignOut: function(test) {
                test.expect(1);
                auth.login("test@metasolutions.se", "testtest").then(function() {
                    return auth.logout().then(function(data) {
                        test.ok(data.user === "guest", "Failed sign out from test account");
                        test.done();
                    });
                }, function() {
                    test.ok(false, "Could not de-authenticate test user");
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
                        test.ok(data.user === "test@metasolutions.se");
                        test.done();
                        auth.removeAuthListener(f);
                    }
                };
                auth.addAuthListener(f);
                auth.login("test@metasolutions.se", "testtest");
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
                auth.login("test@metasolutions.se", "testtest").then(function() {
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
                    test.ok(entry.getResource(true).getName() === "donald");
                    test.done();
                });
            }
        }
    });
});
