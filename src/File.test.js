import xmldom from '@xmldom/xmldom';
import utils from './utils.js';
import init from '../tests/init.js';

const { context } = init();

test('Create entry with a JSON file', async () => {
  const entry = await context().newEntry().commit();
  const r = entry.getResource(true);
  await r.putJSON({ a: 'v' });
  entry.setRefreshNeeded(true);
  await entry.refresh();
  expect(entry.getEntryInfo().getFormat()).toBe('application/json'); // If fail: Mimetype is not application/json as it should.');
  const data = await r.getJSON();
  expect(typeof data).toBe('object');
  expect(data.a).toBe('v'); // If fail: Json not set correctly.');
});


test('Create entry with a text file', async () => {
  const entry = await context().newEntry().commit();
  const resource = entry.getResource(true);
  await resource.putText('test');
  entry.setRefreshNeeded(true);
  await entry.refresh();
  expect(entry.getEntryInfo().getFormat()).toBe('text/plain'); // If fail: 'Mimetype is not text/plain as it should.');
  const data = await resource.getText();
  expect(typeof data).toBe('string')
  expect(data).toBe('test'); // If fail: Text not set correctly as resource.');
});

test('Create entry with a xml file', async () => {
  const entry = await context().newEntry().commit();

  const r = entry.getResource(true);
  if (utils.isBrowser()) {
    const DOMParser = DOMParser;
  } else {
    const DOMParser = xmldom.DOMParser;
  };

  const parser = new xmldom.DOMParser();
  let xml = parser.parseFromString('<book></book>', 'text/xml');

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