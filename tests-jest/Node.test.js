const fs = require('fs');
const store = require('../dist/entrystore.node');
const config = require('./config');

const { repository, adminUser, adminPassword } = config;
let context;


async function setUp() {
    if (!context) {
        const es = new store.EntryStore(repository);
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
    
        const es = new store.EntryStore(repository);
        const auth = es.getAuth();
        await auth.logout();
      } catch (err) {
        // console.error(err);
      }
};

beforeAll(setUp);
afterAll(tearDown);

test('uploadFile', async () => {
    expect.assertions(3);
    return context.newEntry().commit().then((entry) => {
        const r = entry.getResource(true);
        // Tests are executed from root of repository
        return r.putFile(fs.createReadStream('./tests/test.jpg'), 'image/jpg').then(() => {
            entry.setRefreshNeeded(true);
            return entry.refresh().then(() => {
                expect(entry.getEntryInfo().getFormat()).toBe('image/jpg'); // If fail: Mimetype is not image/jpg it should.');
                expect(entry.getEntryInfo().getSize()).toBeGreaterThan(0); // If fail: 'Binary size is 0.');
                return r.get().then((data) => {
                    expect(data.length).toBeGreaterThan(0); // If fail: 'Test image is empty.');
                });
            });
        });
    }, () => {
        console.log('Something went wrong when uploading a jpg-file.');
    });
});
