import init from '../tests/init.js';

const { context, list } = init(true);

test('Make sure list has two members', async () => {
  const resource = list().getResource(true);
  const entries = await resource.getEntries();
  expect(entries.length).toBeGreaterThanOrEqual(2); // If fail: 'List have too few children');
});



test('Add a member to existing list', async () => {
  const entry = await context().newEntry().commit();
  const lres = list().getResource(true);
  expect(entry.getParentLists().length).toBe(0); // If fail: 'New entry should not belong to a parentList unless explicitly specified.');
  expect(entry.needRefresh()).not.toBeTruthy(); // If fail: 'New entry should not be in need of a refresh.');
  await lres.addEntry(entry);
  return lres.getEntries().then((entries) => {
    expect(entries.indexOf(entry)).toBeGreaterThanOrEqual(0); // If fail: 'Entry not contained in list, list not refreshed.');
  });
});

test('Add member to list on creation', async () => {
  const entry = await context().newEntry().setParentList(list()).commit();
  const entries = await list().getResource(true).getEntries();
  expect(entries.indexOf(entry)).toBeGreaterThanOrEqual(0); // If fail: 'Entry not contained in list, list not refreshed or entry not added to list.');
});

test('Remove member from list', async () => {
  const entry = await context().newEntry().setParentList(list()).commit();
  const listResource = list().getResource(true);
  expect(entry.getParentLists().length).toBe(1); // If fail: 'New entry should belong to the specified parentList provided upon creation.');
  expect(entry.needRefresh()).not.toBeTruthy(); // If fail: 'New entry should not be in need of a refresh.');

  const entries = await listResource.getEntries();
  expect(entries.indexOf(entry)).toBeGreaterThanOrEqual(0); // If fail: 'Entry not contained in list, list not refreshed.');
  await listResource.removeEntry(entry);

  const entries2 = await listResource.getEntries();
  expect(entries2.indexOf(entry)).toBe(-1); // If fail: 'Entry not removed from list, either list not refreshed or entry not removed from list.');
});
