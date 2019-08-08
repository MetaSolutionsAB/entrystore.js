const { EntryStore } = require('../dist/EntryStore.node');
const config = require('./config');

const { repository, contextId, entryId, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const MAX_AGE = 86400;
let authAdminReady;

exports.EntryStore = {
  inGroups: true,
  withoutLogin: {
    async setUp(callback) {
      await es.getAuth().logout();
      callback();
    },
    initStore(test) {
      test.ok(es.getBaseURI() === repository);
      test.done();
    },
    async getEntry(test) {
      try {
        const entry = await es.getEntry(`${repository}${contextId}/entry/${entryId}`);
        test.ok(entry != null);
        test.done();
      } catch (err) {
        test.ok(false, err);
        test.done();
      }
    },
    getContext(test) {
      const c = es.getContextById('1');
      test.ok(c.getId() === '1');
      test.done();
    },
  },
  withAdminLogin: {
    async setUp(callback) {
      if (!authAdminReady) {
        // await es.getAuth().logout();
        await es.getAuth().login(adminUser, adminPassword, MAX_AGE);
        authAdminReady = true;
      }
      callback();
    },
    asyncListenerLogout(test) {
      const asyncListener = async (promise, callType) => {
        test.ok(callType === 'logout', "Wrong calltype, should be 'logout'");
        try {
          await promise;
          authAdminReady = false;
          test.done();
        } catch (err) {
          test.done();
        }
      };
      es.addAsyncListener(asyncListener);
      es.getAuth().logout();
      es.removeAsyncListener(asyncListener);
    },
    async getContextList(test) {
      try {
        const entries = await es.getContextList().getEntries();
        test.ok(entries.length > 0, 'No contexts found.');
        test.done();
      } catch (err) {
        test.ok(false, 'Failed loading of contexts.');
        test.done();
      }
    },
    async getPrincipalList(test) {
      const plist = es.getPrincipalList();
      try {
        const entries = await plist.getEntries();
        test.ok(entries.length > 0, 'No principals found');
        test.done();
      } catch (err) {
        test.ok(false, 'Failed loading principalList.');
        test.done();
      }
    },
    async createContext(test) {
      try {
        const entry = await es.newContext().commit();
        test.ok(entry.isContext(), 'Entry created, but it is not a context');
        test.done();
      } catch (err) {
        test.ok(false, 'Failed creating context.');
        test.done();
      }
    },
    async createUser(test) {
      const username = `${new Date().getTime()}`;
      try {
        const entry = await es.newUser(username).commit();
        test.ok(entry.isUser(), 'Entry created, but it is not a user!');
        test.ok(entry.getResource(true).getName() === username, 'User created, but username provided in creation step is missing.');
        test.done();
      } catch (err) {
        test.ok(false, 'Failed creating user.');
        test.done();
      }
    },
    async createGroup(test) {
      try {
        const entry = await es.newGroup().commit();
        test.ok(entry.isGroup(), 'Entry created, but it is not a group!');
        test.done();
      } catch (err) {
        test.ok(false, 'Failed creating group.');
        test.done();
      }
    },
  },
};
