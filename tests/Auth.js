const config = require('./config');
const store = require('../dist/EntryStore.node');

const { repository, nonAdminUser, nonAdminPassword } = config;
const es = new store.EntryStore(repository);
const auth = es.getAuth();
const MAX_AGE = 86400;

exports.Auth = {
  authorize: {
    cookieSignIn(test) {
      test.expect(1);
      auth.login(nonAdminUser, nonAdminPassword, MAX_AGE).then((data) => {
        test.ok(data.user === nonAdminUser);
        test.done();
      }, () => {
        test.ok(false, `Could not authenticate user ${nonAdminUser} with password ${nonAdminPassword}`);
        test.done();
      });
    },
    cookieSignOut(test) {
      test.expect(1);
      auth.login(nonAdminUser, nonAdminPassword, MAX_AGE)
        .then(() => auth.logout()
          .then((data) => {
            test.ok(data.user === 'guest', `Failed sign out from account ${nonAdminUser}.`);
            test.done();
          }), () => {
          test.ok(false, 'Could not de-authenticate user ');
          test.done();
        });
    },
  },
  fromGuestListeners: {
    setUp(callback) {
      auth.logout().then(() => {
        callback();
      });
    },
    login(test) {
      test.expect(1);
      const authCallback = (topic, data) => {
        if (topic === 'login') {
          test.ok(data.user === nonAdminUser);
          test.done();
          auth.removeAuthListener(authCallback);
        } else {
          test.ok(false, 'Could not login');
          test.done();
        }
      };
      auth.addAuthListener(authCallback);
      auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
    },
    guestUserEntry(test) {
      test.expect(1);
      auth.getUserEntry().then((entry) => {
        const name = entry.getResource(true).getName();
        test.ok(name === 'guest');
        test.done();
      });
    },
  },
  fromUserListeners: {
    setUp(callback) {
      auth.login(nonAdminUser, nonAdminPassword, MAX_AGE).then(() => {
        callback();
      });
    },
    logout(test) {
      test.expect(1);
      const authCallback = (topic, data) => {
        if (topic === 'logout') {
          test.ok(data.user === 'guest');
          test.done();
          auth.removeAuthListener(authCallback);
        }
      };
      auth.addAuthListener(authCallback);
      auth.logout();
    },
    signedInUserEntry(test) {
      test.expect(1);
      auth.getUserEntry().then((entry) => {
        test.ok(entry.getResource(true).getName() === nonAdminUser);
        test.done();
      });
    },
  },
};
