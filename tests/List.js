const { EntryStore } = require('../dist/entrystore.node');
const config = require('./config');

const { repository, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
let lst;
let context;
let finished = false;
const MAX_AGE = 86400;

const setUp = async (callback) => {
  if (!context) {
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword, MAX_AGE);
    const contextEntry = await es.newContext().commit();
    context = contextEntry.getResource(true);

    lst = await context.newList().commit();
    await context.newEntry().setParentList(lst).commit();
    await context.newEntry().setParentList(lst).commit();
  }
  callback();
};

const tearDown = async (callback) => {
  if (finished) {
    try {
      const contextEntry = await context.getEntry();
      await contextEntry.del(true);

      const listEntry = await lst.getEntry();
      await listEntry.del(true);

      const auth = es.getAuth();
      await auth.logout();
    } catch (err) {
      // console.error(err);
    }
  }
  callback();
};
exports.List = {
  setUp,
  tearDown,
  async members(test) {
    const resource = lst.getResource(true);
    const entries = await resource.getEntries();
    test.ok(entries.length >= 2, 'List have to few children');
    test.done();
  },

  async addMember(test) {
    const entry = await context.newEntry().commit();
    const lres = lst.getResource(true);
    test.ok(entry.getParentLists().length === 0, 'New entry should not belong to a parentList unless explicitly specified.');
    test.ok(!entry.needRefresh(), 'New entry should not be in need of a refresh.');
    await lres.addEntry(entry);
    lres.getEntries().then((entries) => {
      test.ok(entries.indexOf(entry) >= 0, 'Entry not contained in list, list not refreshed.');
      test.done();
    });
  },

  async addMemberOnCreate(test) {
    const entry = await context.newEntry().setParentList(lst).commit();
    const entries = await lst.getResource(true).getEntries();
    test.ok(entries.indexOf(entry) >= 0, 'Entry not contained in list, list not refreshed or entry not added to list.');
    test.done();
  },

  async removeMember(test) {
    const entry = await context.newEntry().setParentList(lst).commit();
    const listResource = lst.getResource(true);
    test.ok(entry.getParentLists().length === 1, 'New entry should belong to the specified parentList provided upon creation.');
    test.ok(!entry.needRefresh(), 'New entry should not be in need of a refresh.');

    const entries = await listResource.getEntries();
    test.ok(entries.indexOf(entry) >= 0, 'Entry not contained in list, list not refreshed.');
    await listResource.removeEntry(entry);

    test.ok(entry.needRefresh(), 'Entry is removed from a list and should be in need of a refresh!');
    const entries2 = await listResource.getEntries();
    test.ok(entries2.indexOf(entry) === -1, 'Entry not removed from list, either list not refreshed or entry not removed from list.');
    test.done();

    finished = true;
  },
};
