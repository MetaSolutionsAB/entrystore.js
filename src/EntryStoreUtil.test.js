import EntryStore from './EntryStore.js';
import EntryStoreUtil from './EntryStoreUtil.js';
import config from '../tests/config.js';

const { repository, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const esu = new EntryStoreUtil(es);
const MAX_AGE = 86400;


async function logInlogOut() {
  await es.getAuth().logout();
  await es.getAuth().login(adminUser, adminPassword, MAX_AGE);
}


describe('User with an admin login', () => {
  beforeAll(() => logInlogOut());

  test('Load entries from EntryStore', async () => {
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
    esu.getEntryByResourceURI(adminsRURI, '_principals');
    const adminsPromise = c.getPromise(adminsRURI);

    // Make sure the state is correct, i.e. four entries, one will be loaded in advance (admin),
    // one will be in the process of being loaded (admins) and two will remain to be loaded (guest and users).
    // If fail: 'Setup of four entries is not correct before load all at once.');

    expect(c.get(adminURI)).toBeTruthy();
    expect(c.get(adminsURI)).not.toBeTruthy();
    expect(c.get(guestURI)).not.toBeTruthy();
    expect(c.get(usersURI)).not.toBeTruthy();
    expect(c.getPromise(adminURI)).not.toBeTruthy();
    expect(c.getPromise(adminsRURI)).toBeTruthy();
    expect(c.getPromise(guestURI)).not.toBeTruthy();
    expect(c.getPromise(usersURI)).not.toBeTruthy();

    const fourInOne = esu.loadEntriesByResourceURIs([adminRURI, adminsRURI, guestRURI, usersRURI],
      '_principals');

    // Make sure the state is correct, i.e. four entries, one is loaded in advance (admin),
    // and three are in the process of being loaded (admins, guest and users).
    // If assertion fail: 'Started loading but not seeing 1 already loaded entry and 3 promises');

    expect(c.get(adminURI)).toBeTruthy();
    expect(c.get(adminsURI)).not.toBeTruthy();
    expect(c.get(guestURI)).not.toBeTruthy();
    expect(c.get(usersURI)).not.toBeTruthy();
    expect(c.getPromise(adminRURI)).not.toBeTruthy();
    expect(c.getPromise(adminsRURI)).toBeTruthy();
    expect(c.getPromise(guestRURI)).toBeTruthy();
    expect(c.getPromise(usersRURI)).toBeTruthy();

    // The admins entry has a new promise different from the previous request.
    expect(c.getPromise(adminsRURI) === adminsPromise).toBeTruthy(); // If fail: Got a new promise for request already in progress');

    const usersPromise = c.getPromise(usersRURI);
    const results = await fourInOne;

    expect(results.length).toBe(4); // If fail: Did not get exactly 4 entries back'
    expect(results[3].getURI()).toBe(usersURI); // If fail: Got entries back in wrong order

    const users = await usersPromise;
    expect(users.getURI()).toBe(usersURI); // If fail: One of the entries own promise returned the wrong entry
  });

  test('Load entry in debounce mode', async () => {
    const adminsURI = es.getEntryURI('_principals', '_admins');
    const adminsRURI = es.getResourceURI('_principals', '_admins');
    const c = es.getCache();

    if (c.get(adminsURI)) {
      c.unCache(c.get(adminsURI));
    }
    const adminsPromiseDirect = esu.getEntryByResourceURIDebounce(adminsRURI, '_principals');
    const adminsPromise = c.getPromise(adminsRURI);
    expect(adminsPromise).not.toBeTruthy();
    const admins = await adminsPromiseDirect;
    expect(admins).toBeTruthy();
  });
  test('Load three entries in debounce mode and force a flush in between', async () => {
    const adminURI = es.getEntryURI('_principals', '_admin');
    const adminRURI = es.getResourceURI('_principals', '_admin');
    const adminsURI = es.getEntryURI('_principals', '_admins');
    const adminsRURI = es.getResourceURI('_principals', '_admins');
    const guestURI = es.getEntryURI('_principals', '_guest');
    const guestRURI = es.getResourceURI('_principals', '_guest');

    // Make sure the three entries we are using for testing purposes are NOT in the cache.
    const c = es.getCache();
    if (c.get(adminURI)) {
      c.unCache(c.get(adminURI));
    }
    if (c.get(adminsURI)) {
      c.unCache(c.get(adminsURI));
    }
    if (c.get(guestURI)) {
      c.unCache(c.get(guestURI));
    }

    // Request first entry, wait a bit, request next entry after some delay
    const adminPromiseDirect = esu.getEntryByResourceURIDebounce(adminRURI, '_principals');
    await new Promise(resolve => setTimeout(resolve, 5));
    esu.getEntryByResourceURIDebounce(adminsRURI, '_principals');
    // The two entries are not yet in the process of being loaded as they are loaded via debounce.
    expect(c.getPromise(adminRURI)).not.toBeTruthy();
    expect(c.getPromise(adminsRURI)).not.toBeTruthy();
    // Request the third entry with another calltype to force the loading and start a new debounce queue.
    const guestPromiseDirect = esu.getEntryByResourceURIDebounce(guestRURI, '_principals', 'newCallType');
    // Two first entries (admin and admins) are now being loaded, last entry not yet (guest)
    expect(c.getPromise(adminRURI)).toBeTruthy();
    expect(c.getPromise(adminsRURI)).toBeTruthy();
    expect(c.getPromise(guestRURI)).not.toBeTruthy();
    await adminPromiseDirect;
    // Two first entries are now loaded, last entry may be in process, but should not have arrived yet.
    expect(c.get(adminURI)).toBeTruthy();
    expect(c.get(adminsURI)).toBeTruthy();
    expect(c.get(guestURI)).not.toBeTruthy();

    await guestPromiseDirect;
    // Last entry should now be loaded as well.
    expect(c.get(guestURI)).toBeTruthy();
  });
});