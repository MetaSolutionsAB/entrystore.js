import fs from 'fs';
import init from '../tests/init.js';

const { context } = init();

test('Upload a file', async () => {
  expect.assertions(3);
  const entry = await context().newEntry().commit();
  const r = entry.getResource(true);
  // Tests are executed from root of repository
  await r.putFile(fs.createReadStream('./tests/test.jpg'), 'image/jpg');
  await entry.refresh();
  expect(entry.getEntryInfo().getFormat()).toBe('image/jpg'); // If fail: Mimetype is not image/jpg it should.');
  expect(entry.getEntryInfo().getSize()).toBeGreaterThan(0); // If fail: 'Binary size is 0.');
  const data = await r.get();
  expect(data.length).toBeGreaterThan(0); // If fail: 'Test image is empty.');
});
