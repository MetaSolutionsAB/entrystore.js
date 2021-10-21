//const { EntryStore, utils } = require('../dist/entrystore.node');
//const config = require('./config');

import  xmldom from 'xmldom';
import EntryStore from './EntryStore';
import utils from './utils';
import config from './config';


const { repository, adminUser, adminPassword } = config;
let context;
const MAX_AGE = 86400;


async function setUp() {
  if (!context) {
    const es = new EntryStore(repository);
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword, MAX_AGE);
    const contextEntry = await es.newContext().commit();
    context = contextEntry.getResource(true);
  }
};

async function tearDown() {
  const contextEntry = await context.getEntry();
  await contextEntry.del(true);
  const es = new EntryStore(repository);
  const auth = es.getAuth();

};

beforeAll(setUp);
afterAll(tearDown);


test('createJSONFile', async () => {
    let entry;
    entry = await context.newEntry().commit();
    const r = entry.getResource(true);
    await r.putJSON({ a: 'v' });
    entry.setRefreshNeeded(true);
    await entry.refresh();
    expect(entry.getEntryInfo().getFormat()).toBe('application/json'); // If fail: Mimetype is not application/json as it should.');
    const data = await r.getJSON();
    expect(typeof data).toBe('object');
    expect(data.a).toBe('v'); // If fail: Json not set correctly.');
});


test('createTextFile', async () => {
    let entry;
    entry = await context.newEntry().commit();
    const resource = entry.getResource(true);
    await resource.putText('test');
    entry.setRefreshNeeded(true);
    await entry.refresh();
    expect(entry.getEntryInfo().getFormat()).toBe('text/plain'); // If fail: 'Mimetype is not text/plain as it should.');
    const data = await resource.getText();
    expect(typeof data).toBe('string')
    expect(data).toBe('test'); // If fail: Text not set correctly as resource.');
});

test('createXMLFile', async () => {
    let entry;
    entry = await context.newEntry().commit();

    const r = entry.getResource(true);
    if (utils.isBrowser()){
      const DOMParser = DOMParser;
    }else{
      const DOMParser = xmldom.DOMParser;
    }
    // const DOMParser = utils.isBrowser() ? DOMParser : require('xmldom').DOMParser;
    
    const parser = new xmldom.DOMParser();

    let xml = '<book></book>';
    xml = parser.parseFromString(xml, 'text/xml');

    await r.putXML(xml);
    entry.setRefreshNeeded(true);
    await entry.refresh();
    expect(entry.getEntryInfo().getFormat()).toBe('text/xml'); // If fail: 'Mimetype is not text/plain as it should.');
    const data = await r.getXML();
    if (utils.isBrowser()) {
      expect(data instanceof Document).toBe('book'); // If fail: 'XML not stored correctly, document contains other xml than sent.'
      expect(data.firstChild.nodeName).toBe('book'); // If fail: 'XML not stored correctly, document contains other xml than sent.'
    } else {
        expect(typeof data).toBe('string'); // If fail: XMl not set correctly as a resource.
        expect(data).toBe('<book/>'); // If fail: XMl not set correctly as a resource.
    }
});