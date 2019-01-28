const { EntryStore } = require('../dist/EntryStore.node');
const config = require('./config');

const es = new EntryStore(config.repository);
let authAdminReady;

exports.EntryStore = {
  inGroups: true,
  withoutLogin: {
    setUp(callback) {
      es.getAuth().logout().then(() => {
        callback();
      });
    },
    initStore(test) {
      test.ok(es.getBaseURI() === config.repository);
      test.done();
    },
    getEntry(test) {
      es.getEntry(`${config.repository}1/entry/1`).then((entry) => {
        test.ok(entry != null);
        test.done();
      }, (err) => {
        test.ok(false, err);
        test.done();
      });
    },
    getContext(test) {
      const c = es.getContextById('1');
      test.ok(c.getId() === '1');
      test.done();
    },
  },
  withAdminLogin: {
    setUp(callback) {
      if (!authAdminReady) {
        es.getAuth().login('admin', 'adminadmin').then(() => {
          authAdminReady = true;
          callback();
        });
      } else {
        callback();
      }
    },
    asyncListenerLogout(test) {
      const al = function (promise, callType) {
        test.ok(callType === 'logout', "Wrong calltype, should be 'logout'");
        promise.then(() => {
          authAdminReady = false;
          test.done();
        }, () => {
          test.done();
        });
      };
      es.addAsyncListener(al);
      es.getAuth().logout();
      es.removeAsyncListener(al);
    },
    getContextList(test) {
      const clist = es.getContextList();
      clist.getEntries().then((entries) => {
        test.ok(entries.length > 0, 'No contexts found.');
        test.done();
      }, () => {
        test.ok(false, 'Failed loading of contexts.');
        test.done();
      });
    },
    getPrincipalList(test) {
      const plist = es.getPrincipalList();
      plist.getEntries().then((entries) => {
        test.ok(entries.length > 0, 'No principals found');
        test.done();
      }, () => {
        test.ok(false, 'Failed loading principalList.');
        test.done();
      });
    },
    createContext(test) {
      es.newContext().commit().then((entry) => {
        test.ok(entry.isContext(), 'Entry created, but it is not a context');
        test.done();
      }, () => {
        test.ok(false, 'Failed creating context.');
        test.done();
      });
    },
    createUser(test) {
      const username = `${new Date().getTime()}`;
      es.newUser(username).commit().then((entry) => {
        test.ok(entry.isUser(), 'Entry created, but it is not a user!');
        test.ok(entry.getResource(true).getName() === username, 'User created, but username provided in creation step is missing.');
        test.done();
      }, () => {
        test.ok(false, 'Failed creating user.');
        test.done();
      });
    },
    createGroup(test) {
      es.newGroup().commit().then((entry) => {
        test.ok(entry.isGroup(), 'Entry created, but it is not a group!');
        test.done();
      }, () => {
        test.ok(false, 'Failed creating group.');
        test.done();
      });
    },
  },
};
