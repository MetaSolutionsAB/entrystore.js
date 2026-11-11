import init from '../tests/init.js';

const { entrystore } = init();

describe('Group', () => {
  let groupEntry;

  afterAll(() => groupEntry?.del());

  test('renames the group on the server', async () => {
    const es = entrystore();
    groupEntry = await es.newGroup(`group-${new Date().getTime()}`).commit();
    const newName = `renamed-${new Date().getTime()}`;

    await groupEntry.getResource(true).setName(newName);
    const reloadedEntry = await es.getEntry(groupEntry.getURI(), {
      forceLoad: true,
    });

    expect(reloadedEntry.getResource(true).getName()).toBe(newName);
  });
});
