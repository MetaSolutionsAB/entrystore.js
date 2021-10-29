import EntryStore from './EntryStore';
import EntryStoreUtil from './EntryStoreUtil';
import Entry from './Entry';
import types from './types';
import config from '../tests/config';

const { repository, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const esu = new EntryStoreUtil(es);
let context;
const MAX_AGE = 86400;

async function setUp() {
  if (!context) {
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword, MAX_AGE);
    const contextEntry = await es.newContext().commit();
    context = contextEntry.getResource(true);
  }
};

async function tearDown() {
  try {
    const contextEntry = await context.getEntry();
    await contextEntry.del(true);

    const listEntry = await lst.getEntry();  // getEntry() does not exist in List.js
    await listEntry.del(true);

    const auth = es.getAuth();
    await auth.logout();
  } catch (err) {
    // console.error(err);
  }
};


beforeAll(setUp);
afterAll(tearDown);

test('Search for specific title', async () => {
  const entries = await es.newSolrQuery().title('Donald').list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0); // If fail: "No entries found for title 'Donald', despite that we are searching against disney suite.");
});

// This test doesn't work using Nodeunit either..
test('Search for specific user name', async () => {
  const entries = await es.newSolrQuery().username('donald').list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0); // If fail:"No entries found for username 'donald', despite that we are searching against disney suite.");
});


test.skip('Search for a list', async () => {
  const entries = await es.newSolrQuery().graphType(types.GT_LIST).list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0); // If fail: 'No list found');
  expect(entries[0].isList()).toBeTruthy(); // If fail: 'Entry found was not a list');
});

test('Search for a user', async () => {
  const entries = await es.newSolrQuery().graphType(types.GT_USER).list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isUser()).toBeTruthy(); // If fail: 'No users found, or entry found was not a user');
});

test('Check if there exists at leas one user which has specific user name', async () => {
  const entries = await es.newSolrQuery().graphType(types.GT_USER).title('Donald').list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isUser()).toBeTruthy(); // If fail:  'No users found with title "Donald" ' + '(assuming default test data in Entrystore), or entry found was not a user');
});

test('Search for a context', async () => {
  const entries = await es.newSolrQuery().graphType(types.GT_CONTEXT).list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isContext()).toBeTruthy(); // If fail: 'No context found, or entry found was not a context');
});

test('Search for a link', async () => {
  const entries = await es.newSolrQuery().entryType(types.ET_LINK).list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isLink()).toBeTruthy(); // If fail: 'No link found, or entry found was not a link');
});

test('Search for specific literal property', async () => {
  const titleEntry = await es.newSolrQuery().literalProperty('dcterms:title', 'Donald').list().getEntries(0);
  const nameEntry = await es.newSolrQuery().literalProperty('foaf:name', 'Donald').list().getEntries(0);
  const entries = [...titleEntry, ...nameEntry];
  expect(entries.length).toBeGreaterThan(0); // If fail: 'Cannot find title Donald via property search.');
});

test('Find two users by utilizing forEach functionality', async () => {
  let callbackCount = 0;
  let endReached = false;
  const totalCount = await es.newSolrQuery().graphType(types.GT_USER).limit(2).list()
    .forEach((userEntry, idx) => {
      if (endReached) {
        // End function called before all callbacks.
      }
      expect(callbackCount).toBe(idx); // If fail: 'Callback index is wrong.');
      callbackCount++;
    });
  endReached = true;
  expect(callbackCount).toBe(totalCount); // If fail: 'Total count does not agree with amount of callbacks.');
});

test('Find two users by utilizing forEach functionality with breaks', async () => {
  const totalCount = await es.newSolrQuery().graphType(types.GT_USER).limit(2).list()
    .forEach((userEntry, index) => {
      expect(index).toBeLessThan(3); // If fail: 'Callbacks continues after attempt to break.');
      return index !== 2;
    });
  expect(totalCount).toBe(3); // If fail: 'Total count is wrong, should be 3 as we stopped iteration after entry 3.');
});

test('Fetch entry by graph type', async () => {
  const entry = await esu.getEntryByGraphType(types.GT_USER);
  expect(entry).toBeInstanceOf(Entry);
});
