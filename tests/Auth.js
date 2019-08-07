const nodeunit = require('nodeunit');
const config = require('./config');
const store = require('../dist/EntryStore.node');

const es = new store.EntryStore(config.repository);
const auth = es.getAuth();

exports.Auth = {
  authorize: {
    cookieSignIn(test) {
      test.expect(1);
      auth.login('admin', 'adminadmin').then((data) => {
        test.ok(data.user === 'donald');
        test.done();
      }, () => {
        test.ok(false, 'Could not authenticate user Donald with password donalddonald');
        test.done();
      });
    },
    cookieSignOut(test) {
      test.expect(1);
      auth.login('admin', 'adminadmin').then(() => auth.logout().then((data) => {
        test.ok(data.user === 'guest', 'Failed sign out from account Donald.');
        test.done();
      }), () => {
        test.ok(false, 'Could not de-authenticate user Donald.');
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
      var authCallback = function (topic, data) {
        if (topic === 'login') {
          test.ok(data.user === 'donald');
          test.done();
          auth.removeAuthListener(authCallback);
        } else {
          test.ok(false, 'Could not login');
          test.done();
        }
      };
      auth.addAuthListener(authCallback);
      auth.login('admin', 'adminadmin');
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
      auth.login('admin', 'adminadmin').then(() => {
        callback();
      });
    },
    logout(test) {
      test.expect(1);
      const f = function (topic, data) {
        if (topic === 'logout') {
          test.ok(data.user === 'guest');
          test.done();
          auth.removeAuthListener(f);
        }
      };
      auth.addAuthListener(f);
      auth.logout();
    },
    signedInUserEntry(test) {
      test.expect(1);
      auth.getUserEntry().then((entry) => {
        test.ok(entry.getResource(true).getName() === 'donald');
        test.done();
      });
    },
  },
};
