import fs from 'fs';
import EntryStore from './EntryStore.js';
import config from '../tests/config.js';

const { repository, adminUser, adminPassword } = config;
let context;


async function setUp() {
  if (!context) {
    const es = new EntryStore(repository);
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword);
    const contextEntry = await es.newContext().commit();
    context = contextEntry.getResource(true);
  }
};


async function tearDown() {
  try {
    const contextEntry = await context.getEntry();
    await contextEntry.del(true);

    const es = new EntryStore(repository);
    const auth = es.getAuth();
    await auth.logout();
  } catch (err) {
    // console.error(err);
  }
};

beforeAll(setUp);
afterAll(tearDown);

test('Upload a file', async () => {
  expect.assertions(3);
  const entry = await context.newEntry().commit();
  const r = entry.getResource(true);
  // Tests are executed from root of repository
  await r.putFile(fs.createReadStream('./tests/test.jpg'), 'image/jpg');
  await entry.refresh();
  expect(entry.getEntryInfo().getFormat()).toBe('image/jpg'); // If fail: Mimetype is not image/jpg it should.');
  expect(entry.getEntryInfo().getSize()).toBeGreaterThan(0); // If fail: 'Binary size is 0.');
  const data = await r.get();
  expect(data.length).toBeGreaterThan(0); // If fail: 'Test image is empty.');
});
