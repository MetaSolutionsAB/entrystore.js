import EntryStore from './EntryStore';
import config from '../tests/config';

const { repository, contextId, entryId, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const MAX_AGE = 86400;


/*
* Auxilary functions for setups
*/

async function logOut() {
  await es.getAuth().logout()
};

async function logInlogOut() {
  await es.getAuth().logout();
  await es.getAuth().login(adminUser, adminPassword, MAX_AGE);
}

describe('A signed out (admin) user', () => {

  beforeEach(() => {
    return logOut();
  });

  test('Make sure EntryStore is initialized', () => {
    expect(es.getBaseURI()).toBe(repository);
  });


  test('Fetching an entry', async () => {
    const entry = await es.getEntry(`${repository}${contextId}/entry/${entryId}`);
    expect(entry).not.toBeNull();
  });

  test('Fetch a context', () => {
    const c = es.getContextById('1');
    expect(c.getId()).toBe('1');
  });
});




describe('A signed in admin (user)', () => {


  beforeEach(() => {
    return logInlogOut();
  });

  test('Sign out then checking if listener caught the signout', done => {
    expect.assertions(2);
    const asyncListener = async (promise, callType) => {
      expect(callType).toBe('logout'); // If fail: Wrong calltype, should be 'logout'
      promise.then((value) => {
        expect(1).toBeTruthy();
        done();
      }, reason => {
        expect(0).toBeTruthy();
        done(reason);
      });

    };
    es.addAsyncListener(asyncListener);
    es.getAuth().logout();
    es.removeAsyncListener(asyncListener);
  });


  test('Fetch context list', async () => {
    expect.assertions(1);
    const entries = await es.getContextList().getEntries();
    expect(entries.length).toBeGreaterThan(0); // If fail: No contexts found.
  });

  test('Fetch principal list', async () => {
    expect.assertions(1);
    const plist = es.getPrincipalList();
    const entries = await plist.getEntries();
    expect(entries.length).toBeGreaterThan(0); // If fail: No principals found
  });


  test('Create a new context and check if it exitsts', async () => {
    expect.assertions(1);
    const entry = await es.newContext().commit();
    expect(entry.isContext()).toBeTruthy(); // If fail: Entry created, but it is not a context

  });


  test('Create a user', async () => {
    expect.assertions(2);
    const username = `${new Date().getTime()}`;
    const entry = await es.newUser(username).commit();
    expect(entry.isUser()).toBeTruthy(); // If fail: Entry created, but it is not a user!
    expect(entry.getResource(true).getName()).toBe(username); // If fail: User created, but username provided in creation step is missing.
  });


  test('Create a group', async () => {
    expect.assertions(1);
    const entry = await es.newGroup().commit();
    expect(entry.isGroup()).toBeTruthy(); // If fail: Entry created, but it is not a group!
  });


  // Bertrand Russel would be proud of this entry
  test('Check so that cache only has one request', async () => {
    expect.assertions(7);
    const contextsEntryURI = es.getEntryURI('_contexts', '_contexts');
    const cache = es.getCache();
    const contextEntry = cache.get(contextsEntryURI);
    if (contextEntry) {
      cache.unCache(contextEntry);
    }
    expect(cache.get(contextsEntryURI)).toBe(undefined); // If fail: Alredy something in cache for explicitly uncached entry
    expect(cache.getPromise(contextsEntryURI)).toBe(undefined); // If fail: Alredy a promise in cache before requesting it
    const promise1 = es.getEntry(contextsEntryURI);
    const promise2 = es.getEntry(contextsEntryURI);
    expect(promise1).toBe(promise2); // If fail: Not reusing same promise for same entry.
    expect(cache.get(contextsEntryURI)).toBe(undefined); // If fail: Entry in cache without delay.'
    expect(cache.getPromise(contextsEntryURI)).not.toBe(undefined); // If fail: 'No promise in cache for requested entry.'
    await promise1;
    expect(cache.getPromise(contextsEntryURI)).toBe(undefined); // If fail: romise remains in cache after entry returned.
    expect(cache.get(contextsEntryURI)).not.toBe(undefined); // If fail: 'Entry not in cache after being returned'
  });
});

