const { EntryStore } = require('../dist/entrystore.node');
const config = require('./config');

const { repository, contextId, entryId, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const MAX_AGE = 86400;

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
      await es.getAuth().logout();
      await es.getAuth().login(adminUser, adminPassword, MAX_AGE);
      callback();
    },
    asyncListenerLogout(test) {
      const asyncListener = async (promise, callType) => {
        test.ok(callType === 'logout', "Wrong calltype, should be 'logout'");
        try {
          await promise;
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
        test.ok(entry.getResource(true).getName() === username,
          'User created, but username provided in creation step is missing.');
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
    async singleRequestInCache(test) {
      try {
        // Bertrand Russels would be proud of this entry
        const contextsEntryURI = es.getEntryURI('_contexts', '_contexts');
        const cache = es.getCache();
        const contextEntry = cache.get(contextsEntryURI);
        if (contextEntry) {
          cache.unCache(contextEntry);
        }
        test.ok(cache.get(contextsEntryURI) === undefined, 'Alredy something in cache for explicitly uncached entry');
        test.ok(cache.getPromise(contextsEntryURI) === undefined, 'Alredy a promise in cache before requesting it');
        const promise1 = es.getEntry(contextsEntryURI);
        const promise2 = es.getEntry(contextsEntryURI);
        test.ok(promise1 === promise2, 'Not reusing same promise for same entry.');
        test.ok(cache.get(contextsEntryURI) === undefined, 'Entry in cache without delay.');
        test.ok(cache.getPromise(contextsEntryURI) !== undefined, 'No promise in cache for requested entry.');
        await promise1;
        test.ok(cache.getPromise(contextsEntryURI) === undefined, 'Promise remains in cache after entry returned.');
        test.ok(cache.get(contextsEntryURI) !== undefined, 'Entry not in cache after being returned');
        test.done();
      } catch (err) {
        test.ok(false, 'Failed in single request check.');
        test.done();
      }
    },
  },
};
