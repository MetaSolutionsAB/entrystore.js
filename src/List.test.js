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

test('loads every page in the order set with setSort', async () => {
  const listEntry = await context().newList().commit();
  for (const title of ['A', 'B', 'C', 'D']) {
    await context()
      .newEntry()
      .addL('dcterms:title', title)
      .setParentList(listEntry)
      .commit();
  }
  const listResource = listEntry
    .getResource(true)
    .setLimit(2)
    .setSort({ sortBy: 'title', descending: true });
  const getTitles = (entries) =>
    entries.map((entry) =>
      entry.getMetadata().findFirstValue(null, 'dcterms:title')
    );

  const firstPage = await listResource.getEntries(0);
  const secondPage = await listResource.getEntries(1);

  expect(getTitles(firstPage)).toEqual(['D', 'C']);
  expect(getTitles(secondPage)).toEqual(['B', 'A']);
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
