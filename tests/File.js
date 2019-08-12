const _ = require('lodash');
const { EntryStore, utils } = require('../dist/EntryStore.node');
const config = require('./config');

const { repository, adminUser, adminPassword } = config;
let context;
let finished = false;

const setUp = async (callback) => {
  if (!context) {
    const es = new EntryStore(repository);
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword, 698700);
    const contextEntry = await es.newContext().commit();
    context = contextEntry.getResource(true);
  }
  callback();
};

const tearDown = async (callback) => {
  if (finished) {
    try {
      const contextEntry = await context.getEntry();
      await contextEntry.del(true);

      const es = new EntryStore(repository);
      const auth = es.getAuth();
      await auth.logout();
    } catch (err) {
      // console.error(err);
    }
  }
  callback();
};

exports.File = {
  setUp,
  tearDown,
  async createJSONFile(test) {
    let entry;
    try {
      entry = await context.newEntry().commit();
    } catch (err) {
      test.ok(false, 'Something went wrong when creating a File entry with JSON content.');
    }

    const r = entry.getResource(true);
    await r.putJSON({ a: 'v' });
    entry.setRefreshNeeded(true);
    await entry.refresh();
    test.ok(entry.getEntryInfo().getFormat() === 'application/json', 'Mimetype is not application/json as it should.');
    const data = await r.getJSON();
    test.ok(_.isObject(data) && data.a === 'v', 'Json not set correctly.');
    test.done();
  },
  async createTextFile(test) {
    let entry;
    try {
      entry = await context.newEntry().commit();
    } catch (err) {
      test.ok(false, 'Something went wrong when creating a Fileentry with text content.');
    }
    const resource = entry.getResource(true);
    await resource.putText('test');
    entry.setRefreshNeeded(true);
    await entry.refresh();
    test.ok(entry.getEntryInfo().getFormat() === 'text/plain', 'Mimetype is not text/plain as it should.');
    const data = await resource.getText();
    test.ok(_.isString(data) && data === 'test', 'Text not set correctly as resource.');
    test.done();
  },
  async createXMLFile(test) {
    let entry;
    try {
      entry = await context.newEntry().commit();
    } catch (err) {
      test.ok(false, 'Something went wrong when creating a File entry with xml content.');
    }
    const r = entry.getResource(true);
    const DOMParser = utils.isBrowser() ? DOMParser : require('xmldom').DOMParser;
    const parser = new DOMParser();

    let xml = '<book></book>';
    xml = parser.parseFromString(xml, 'text/xml');

    await r.putXML(xml);
    entry.setRefreshNeeded(true);
    await entry.refresh();
    test.ok(entry.getEntryInfo().getFormat() === 'text/xml', 'Mimetype is not text/plain as it should.');
    const data = await r.getXML();
    if (utils.isBrowser()) {
      test.ok(data instanceof Document && data.firstChild.nodeName === 'book',
        'XML not stored correctly, document contains other xml than sent.');
      test.done();
    } else {
      test.ok(_.isString(data) && data === '<book/>', 'XMl not set correctly as a resource.');
      test.done();
    }
    finished = true;
  },
};
