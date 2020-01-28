const { EntryStore, EntryStoreUtil, types } = require('../dist/entrystore.node');

const config = require('./config');

const { repository, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const esu = new EntryStoreUtil(es);
const MAX_AGE = 86400;

exports.EntryStore = {
  inGroups: true,
  withAdminLogin: {
    async setUp(callback) {
      await es.getAuth().logout();
      await es.getAuth().login(adminUser, adminPassword, MAX_AGE);
      callback();
    },
    async loadEntries(test) {
      try {
        const adminURI = es.getEntryURI('_principals', '_admin');
        const adminRURI = es.getResourceURI('_principals', '_admin');
        const adminsURI = es.getEntryURI('_principals', '_admins');
        const adminsRURI = es.getResourceURI('_principals', '_admins');
        const guestURI = es.getEntryURI('_principals', '_guest');
        const guestRURI = es.getResourceURI('_principals', '_guest');
        const usersURI = es.getEntryURI('_principals', '_users');
        const usersRURI = es.getResourceURI('_principals', '_users');
        await es.getEntry(adminURI);
        const c = es.getCache();
        if (c.get(adminsURI)) {
          c.unCache(c.get(adminsURI));
        }
        if (c.get(guestURI)) {
          c.unCache(c.get(guestURI));
        }
        if (c.get(usersURI)) {
          c.unCache(c.get(usersURI));
        }
        esu.getEntryByResourceURI(adminsRURI);
        const adminsPromise = c.getPromise(adminRURI);

        // Make sure the state is correct, i.e. four entries, one will be loaded in advance (admin),
        // one will be in the process of being loaded (admins) and two will remain to be loaded (guest and users).
        test.ok(c.get(adminURI) && !c.get(adminsURI) && !c.get(guestURI) && !c.get(usersURI)
          && !c.getPromise(adminURI) && c.getPromise(adminsRURI) && !c.getPromise(guestURI) && !c.getPromise(usersURI),
        'Setup of four entries is not correct before load all at once.');
        const fourInOne = esu.loadEntriesByResourceURIs([adminRURI, adminsRURI, guestRURI, usersRURI],
          '_principals');

        // Make sure the state is correct, i.e. four entries, one is loaded in advance (admin),
        // and three are in the process of being loaded (admins, guest and users).
        test.ok(c.get(adminURI) && !c.get(adminsURI) && !c.get(guestURI) && !c.get(usersURI)
          && !c.getPromise(adminRURI) && c.getPromise(adminsRURI) && c.getPromise(guestRURI) && c.getPromise(usersRURI),
        'Started loading but not seeing 1 already loaded entry and 3 promises');

        // The admins entry has a new promise different from the previous request.
        test.ok(adminsPromise !== c.getPromise(adminsRURI), 'Got a new promise for request already in progress');

        const usersPromise = c.getPromise(usersRURI);
        const results = await fourInOne;

        test.ok(results.length === 4, 'Did not get exactly 4 entries back');
        test.ok(results[3].getURI() === usersURI, 'Got entries back in wrong order');
        const users = await usersPromise;
        test.ok(users.getURI() === usersURI, 'One of the entries own promise returned the wrong entry');
        test.done();
      } catch (err) {
        test.ok(false, 'Failed in single request check.');
        test.done();
      }
    },
  },
};
