const config = require('./config');
const store = require('../dist/entrystore.node');

const { repository, nonAdminUser, nonAdminPassword } = config;
const es = new store.EntryStore(repository);
const auth = es.getAuth();
const MAX_AGE = 86400;

exports.Auth = {
  authorize: {
    async cookieSignIn(test) {
      test.expect(1);
      try {
        const data = await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
        test.ok(data.user === nonAdminUser);
        test.done();
      } catch (err) {
        test.ok(false, `Could not authenticate user ${nonAdminUser} with password ${nonAdminPassword}`);
        test.done();
      }
    },
    async cookieSignOut(test) {
      test.expect(1);
      await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
      try {
        const data = await auth.logout();
        test.ok(data.user === 'guest', `Failed sign out from account ${nonAdminUser}.`);
        test.done();
      } catch (err) {
        test.ok(false, 'Could not de-authenticate user ');
        test.done();
      }
    },
  },
  fromGuestListeners: {
    async setUp(callback) {
      await auth.logout();
      callback();
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
    }
    ,
  },
  fromUserListeners: {
    async setUp(callback) {
      await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
      callback();
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
    async signedInUserEntry(test) {
      test.expect(1);
      try {
        const entry = await auth.getUserEntry();
        test.ok(entry.getResource(true).getName() === nonAdminUser);
        test.done();
      } catch (err) {
        test.ok(false, 'Could not login');
        test.done();
      }
    },
  },
};
