const fs = require('fs');
const store = require('../dist/entrystore.node');
const config = require('./config');

const { repository, adminUser, adminPassword } = config;
let context;

const setUp = async (callback) => {
  if (!context) {
    const es = new store.EntryStore(repository);
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword);
    const contextEntry = await es.newContext().commit();
    context = contextEntry.getResource(true);
  }
  callback();
};

const tearDown = async (callback) => {
  try {
    const contextEntry = await context.getEntry();
    await contextEntry.del(true);

    const es = new store.EntryStore(repository);
    const auth = es.getAuth();
    await auth.logout();
  } catch (err) {
    // console.error(err);
  }
  callback();
};


exports.Node = {
  setUp,
  tearDown,
  uploadFile(test) {
    context.newEntry().commit().then((entry) => {
      const r = entry.getResource(true);
      // Tests are executed from root of repository
      return r.putFile(fs.createReadStream('./tests/test.jpg'), 'image/jpg').then(() => {
        entry.setRefreshNeeded(true);
        return entry.refresh().then(() => {
          test.ok(entry.getEntryInfo().getFormat() === 'image/jpg',
            'Mimetype is not image/jpg it should.');
          test.ok(entry.getEntryInfo().getSize() > 0, 'Binary size is 0.');
          return r.get().then((data) => {
            test.ok(data.length > 0, 'Test image is empty.');
            test.done();
          });
        });
      });
    }, () => {
      test.ok(false, 'Something went wrong when uploading a jpg-file.');
    });
  },
};
