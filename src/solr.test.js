import types from './types.js';
import init from '../tests/init.js';

const { context, entrystore, entrystoreutil } = init();


test('Search for specific title', async () => {
  const entries = await entrystore().newSolrQuery().title('Donald').list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0); // If fail: "No entries found for title 'Donald', despite that we are searching against disney suite.");
});

// This test doesn't work using Nodeunit either..
test('Search for specific user name', async () => {
  const entries = await entrystore().newSolrQuery().username('donald').list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0); // If fail:"No entries found for username 'donald', despite that we are searching against disney suite.");
});


test.skip('Search for a list', async () => {
  const entries = await entrystore().newSolrQuery().graphType(types.GT_LIST).list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0); // If fail: 'No list found');
  expect(entries[0].isList()).toBeTruthy(); // If fail: 'Entry found was not a list');
});

test('Search for a user', async () => {
  const entries = await entrystore().newSolrQuery().graphType(types.GT_USER).list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isUser()).toBeTruthy(); // If fail: 'No users found, or entry found was not a user');
});

test('Check if there exists at leas one user which has specific user name', async () => {
  const entries = await entrystore().newSolrQuery().graphType(types.GT_USER).title('Donald').list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isUser()).toBeTruthy(); // If fail:  'No users found with title "Donald" ' + '(assuming default test data in Entrystore), or entry found was not a user');
});

test('Search for a context', async () => {
  const entries = await entrystore().newSolrQuery().graphType(types.GT_CONTEXT).list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isContext()).toBeTruthy(); // If fail: 'No context found, or entry found was not a context');
});

test('Search for a link', async () => {
  const entries = await entrystore().newSolrQuery().entryType(types.ET_LINK).limit(1).list().getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isLink()).toBeTruthy(); // If fail: 'No link found, or entry found was not a link');
});

test('Search for specific literal property', async () => {
  const titleEntry = await entrystore().newSolrQuery().literalProperty('dcterms:title', 'Donald').list().getEntries(0);
  const nameEntry = await entrystore().newSolrQuery().literalProperty('foaf:name', 'Donald').list().getEntries(0);
  const entries = [...titleEntry, ...nameEntry];
  expect(entries.length).toBeGreaterThan(0); // If fail: 'Cannot find title Donald via property search.');
});

test('Find two users by utilizing forEach functionality', async () => {
  let callbackCount = 0;
  let endReached = false;
  const totalCount = await entrystore().newSolrQuery().graphType(types.GT_USER).limit(2).list()
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
  const totalCount = await entrystore().newSolrQuery().graphType(types.GT_USER).limit(2).list()
    .forEach((userEntry, index) => {
      expect(index).toBeLessThan(3); // If fail: 'Callbacks continues after attempt to break.');
      return index !== 2;
    });
  expect(totalCount).toBe(3); // If fail: 'Total count is wrong, should be 3 as we stopped iteration after entry 3.');
});

test('Fetch entry by graph type', async () => {
  const entry = await entrystoreutil().getEntryByGraphType(types.GT_USER);
  expect(entry.isUser()).toBeTruthy();
});
