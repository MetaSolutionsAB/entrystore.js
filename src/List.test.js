import EntryStore from './EntryStore';
import config from '../tests/config';

const { repository, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
let lst;
let context;
const MAX_AGE = 86400;


async function setUpList() {
  try {
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword, MAX_AGE);
    const contextEntry = await es.newContext().commit();
    context = contextEntry.getResource(true);

    lst = await context.newList().commit();
    await context.newEntry().setParentList(lst).commit();
    await context.newEntry().setParentList(lst).commit(); // Not duplicate, but a second entry
  } catch (err) {
    console.log('Could not set up list test caused by: ' + err + '.');
  }
};


async function tearDownList() {
  try {
    const contextEntry = await context.getEntry();
    await contextEntry.del(true);

    //const listEntry = await lst.getEntry(); // getEntry() does not exist in List.js
    //await lst.del(true);

    const auth = es.getAuth();
    await auth.logout();
  } catch (err) {
    console.log('Could not tear down list test caused by: ' + err + '.');
  }
};

beforeAll(setUpList);
afterAll(tearDownList);

test('Make sure list has two members', async () => {
  const resource = lst.getResource(true);
  const entries = await resource.getEntries();
  expect(entries.length).toBeGreaterThanOrEqual(2); // If fail: 'List have too few children');
});



test('Add a member to existing list', async () => {
  const entry = await context.newEntry().commit();
  const lres = lst.getResource(true);
  expect(entry.getParentLists().length).toBe(0); // If fail: 'New entry should not belong to a parentList unless explicitly specified.');
  expect(entry.needRefresh()).not.toBeTruthy(); // If fail: 'New entry should not be in need of a refresh.');
  await lres.addEntry(entry);
  return lres.getEntries().then((entries) => {
    expect(entries.indexOf(entry)).toBeGreaterThanOrEqual(0); // If fail: 'Entry not contained in list, list not refreshed.');
  });
});

test('Add member to list on creation', async () => {
  const entry = await context.newEntry().setParentList(lst).commit();
  const entries = await lst.getResource(true).getEntries();
  expect(entries.indexOf(entry)).toBeGreaterThanOrEqual(0); // If fail: 'Entry not contained in list, list not refreshed or entry not added to list.');
});

test('Remove member from list', async () => {
  const entry = await context.newEntry().setParentList(lst).commit();
  const listResource = lst.getResource(true);
  expect(entry.getParentLists().length).toBe(1); // If fail: 'New entry should belong to the specified parentList provided upon creation.');
  expect(entry.needRefresh()).not.toBeTruthy(); // If fail: 'New entry should not be in need of a refresh.');

  const entries = await listResource.getEntries();
  expect(entries.indexOf(entry)).toBeGreaterThanOrEqual(0); // If fail: 'Entry not contained in list, list not refreshed.');
  await listResource.removeEntry(entry);

  expect(entry.needRefresh()).toBeTruthy(); // If fail: 'Entry is removed from a list and should be in need of a refresh!');
  const entries2 = await listResource.getEntries();
  expect(entries2.indexOf(entry)).toBe(-1); // If fail: 'Entry not removed from list, either list not refreshed or entry not removed from list.');
});
