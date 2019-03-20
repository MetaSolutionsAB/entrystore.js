const { EntryStore } = require('../dist/EntryStore.node');
const config = require('./config');

const es = new EntryStore(config.repository);
const c = es.getContextById('1');
let ready;
let lst;

exports.List = {
  setUp(callback) {
    if (!ready) {
      es.auth({ user: 'Donald', password: 'donalddonald' }).then(() => {
        c.newList().create().then((listentry) => {
          lst = listentry;
          c.newEntry().setParentList(lst).create().then((entry1) => {
            e1 = entry1;
            c.newEntry().setParentList(lst).create().then((entry2) => {
              e2 = entry2;
              ready = true;
              callback();
            });
          });
        });
      });
    } else {
      callback();
    }
  },

  members(test) {
    const resource = lst.getResource(true);
    resource.getEntries().then((entries) => {
      test.ok(entries.length >= 2, 'List have to few children');
      test.done();
    });
  },

  addMember(test) {
    c.newEntry().create().then((entry) => {
      const lres = lst.getResource(true);
      test.ok(entry.getParentLists().length === 0, 'New entry should not belong to a parentList unless explicitly specified.');
      test.ok(!entry.needRefresh(), 'New entry should not be in need of a refresh.');
      lres.addEntry(entry).then(() => {
        lres.getEntries().then((entries) => {
          test.ok(entries.indexOf(entry) >= 0, 'Entry not contained in list, list not refreshed.');
          test.done();
        });
      });
    });
  },

  addMemberOnCreate(test) {
    c.newEntry().setParentList(lst).create().then((entry) => {
      lst.getResource(true).getEntries().then((entries) => {
        test.ok(entries.indexOf(entry) >= 0, 'Entry not contained in list, list not refreshed or entry not added to list.');
        test.done();
      });
    });
  },

  removeMember(test) {
    c.newEntry().setParentList(lst).create().then((entry) => {
      const lres = lst.getResource(true);
      test.ok(entry.getParentLists().length === 1, 'New entry should belong to the specified parentList provided upon creation.');
      test.ok(!entry.needRefresh(), 'New entry should not be in need of a refresh.');
      lres.getEntries().then((entries) => {
        test.ok(entries.indexOf(entry) >= 0, 'Entry not contained in list, list not refreshed.');
        lres.removeEntry(entry).then(() => {
          test.ok(entry.needRefresh(), 'Entry is removed from a list and should be in need of a refresh!');
          lres.getEntries().then((entries2) => {
            test.ok(entries2.indexOf(entry) == -1, 'Entry not removed from list, either list not refreshed or entry not removed from list.');
            test.done();
          });
        });
      });
    });
  },
};
