const fs = require('fs');
const { EntryStore } = require('../dist/entrystore.node');
const config = require('./config');

const { repository, nonAdminUser, nonAdminPassword } = config;
const es = new EntryStore(repository);
const c = es.getContextById('1');
let ready;

exports.Node = {
  setUp(callback) {
    if (!ready) {
      es.auth({ user: 'Donald', password: 'donalddonald' }).then(() => {
        ready = true;
        callback();
      });
    } else {
      callback();
    }
  },
  uploadFile(test) {
    c.newEntry().commit().then((entry) => {
      const r = entry.getResource(true);
      return r.putFile(fs.createReadStream('./test.jpg'), 'image/jpg').then(() => {
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
