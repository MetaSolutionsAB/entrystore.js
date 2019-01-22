const _ = require('lodash');
const { EntryStore, utils } = require('../dist/EntryStore.node');
const config = require('./config');

const es = new EntryStore(config.repository);
const context = es.getContextById('1');
let ready;

exports.File = {
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
  createJSONFile(test) {
    context.newEntry().commit().then((entry) => {
      const r = entry.getResource(true);
      return r.putJSON({ a: 'v' }).then(() => {
        entry.setRefreshNeeded(true);
        return entry.refresh().then(() => {
          test.ok(entry.getEntryInfo().getFormat() === 'application/json', 'Mimetype is not application/json as it should.');
          return r.getJSON().then((data) => {
            test.ok(_.isObject(data) && data.a === 'v', 'Json not set correctly.');
            test.done();
          });
        });
      });
    }, () => {
      test.ok(false, 'Something went wrong when creating a File entry with JSON content.');
    });
  },
  createTextFile(test) {
    context.newEntry().commit().then((entry) => {
      const resource = entry.getResource(true);
      return resource.putText('test').then(() => {
        entry.setRefreshNeeded(true);
        return entry.refresh().then(() => {
          test.ok(entry.getEntryInfo().getFormat() === 'text/plain', 'Mimetype is not text/plain as it should.');
          return resource.getText().then((data) => {
            test.ok(_.isString(data) && data === 'test', 'Text not set correctly as resource.');
            test.done();
          });
        });
      });
    }, () => {
      test.ok(false, 'Something went wrong when creating a Fileentry with text content.');
    });
  },
  createXMLFile(test) {
    context.newEntry().commit().then((entry) => {
      const r = entry.getResource(true);
      const DOMParser = utils.isBrowser() ? DOMParser : new require('xmldom').DOMParser;
      const parser = new DOMParser();

      let xml = '<book></book>';
      xml = parser.parseFromString(xml, 'text/xml');

      return r.putXML(xml).then(() => {
        entry.setRefreshNeeded(true);
        return entry.refresh().then(() => {
          test.ok(entry.getEntryInfo().getFormat() === 'text/xml', 'Mimetype is not text/plain as it should.');
          return r.getXML().then((data) => {
            if (isBrowser()) {
              test.ok(data instanceof Document && data.firstChild.nodeName === 'book',
                'XML not stored correctly, document contains other xml than sent.');
              test.done();
            } else {
              test.ok(_.isString(data) && data === '<book></book>', 'XMl not set correctly as a resource.');
              test.done();
            }
          });
        });
      });
    }, () => {
      test.ok(false, 'Something went wrong when creating a File entry with xml content.');
    });
  },
};
