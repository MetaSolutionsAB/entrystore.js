import EntryStore from './EntryStore';
import config from '../tests/config';

const { repository, contextId, entryId, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const MAX_AGE = 86400;


/*
* Auxilary functions for setups
*/

async function setUp1() {
  await es.getAuth().logout()
};

async function setUp2() {
  await es.getAuth().logout();
  await es.getAuth().login(adminUser, adminPassword, MAX_AGE);
}

describe('Not signed in', () => {

  beforeEach(() => {
    return setUp1();
  });

  test('Make sure EntryStore is initialized', () => {
    expect(es.getBaseURI()).toBe(repository);
  });

  test('Fetch a specific context', () => {
    const c = es.getContextById('1');
    expect(c.getId()).toBe('1');
  });

  test.skip('Fetching a specific entry', async () => {
    //const entry = await es.getEntry(`orange`);
    //'https://a.dev.entryscape.com/store/270/entry/orange',
    const c = await es.getContextById('1');
    //console.log(c);
    const entry = await c.getEntryById('1');
    //console.log(entry);
    //const entry = await es.getEntry(`${repository}/${contextId}/entry/${entryId}`);
    expect(entry).not.toBeNull();
  });
});




describe('Signed in as admin user', () => {

  beforeEach(() => {
    return setUp2();
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
    const entries = await es.getContextList().getEntries();
    expect(entries.length).toBeGreaterThan(0); // If fail: No contexts found.
  });

  test('Fetch principal list', async () => {
    const plist = es.getPrincipalList();
    const entries = await plist.getEntries();
    expect(entries.length).toBeGreaterThan(0); // If fail: No principals found
  });


  test('Create a new context and check if it exitsts', async () => {
    const entry = await es.newContext().commit();
    expect(entry.isContext()).toBeTruthy(); // If fail: Entry created, but it is not a context
  });


  test('Create a user', async () => {
    const username = `${new Date().getTime()}`;
    const userEntry = await es.newUser(username).commit();
    expect(userEntry.isUser()).toBeTruthy(); // If fail: Entry created, but it is not a user!
    expect(userEntry.getResource(true).getName()).toBe(username); // If fail: User created, but username provided in creation step is missing.
    await userEntry.del(true);
  });


  test('Create a group', async () => {
    const groupEntry = await es.newGroup().commit();
    expect(groupEntry.isGroup()).toBeTruthy(); // If fail: Entry created, but it is not a group!
    await groupEntry.del(true);
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

