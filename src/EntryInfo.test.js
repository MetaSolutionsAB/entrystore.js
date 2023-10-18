import { Graph } from '@entryscape/rdfjson'
import EntryStore from './EntryStore.js';
import config from '../tests/config.js';

const { repository, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const now = new Date();
const yesterday = (new Date()).setDate(now.getDate() - 1);
const tomorrow = (new Date()).setDate(now.getDate() + 1);
let context;
const MAX_AGE = 86400;


async function setUp() {
  if (!context) {
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

  const auth = es.getAuth();
  await auth.logout();
}


beforeAll(() => {
  return setUp();
});

afterAll(() => {
  return tearDown();
});

describe('User with admin login', () => {

  test('Check date info of an entry', async () => {
    const entry = await context.newEntry().commit();
    const ei = entry.getEntryInfo();
    const cr = ei.getCreationDate();
    expect(cr > yesterday && cr < tomorrow).toBeTruthy();
    const mo = ei.getModificationDate();
    expect(mo > yesterday && mo < tomorrow).toBeTruthy();


    expect(mo >= cr).toBeTruthy();
    entry.setMetadata(new Graph({
      'http://example.com': {
        'http://purl.org/dc/terms/title': [{
          value: 'A title',
          type: 'literal',
        }],
      },
    }));
    await entry.commitMetadata();
    expect(ei.getModificationDate() >= mo).toBeTruthy();
  });

  test('Check user info of entry', async () => {
    const user = await es.getUserEntry();
    const entry = await context.newEntry().commit();
    const ei = entry.getEntryInfo();
    expect(ei.getCreator()).toBe(user.getResourceURI());
  });

  test('Get contributor info of entry', async () => {
    const user = await es.getUserEntry();
    const entry = await context.newEntry().commit();
    const contr = entry.getEntryInfo().getContributors();
    expect(contr.length).toBe(1);
    expect(contr[0]).toBe(user.getResourceURI());
  });

  test('Get acl info of entry', async () => {
    const entry = await context.newEntry().commit();
    const ei = entry.getEntryInfo();
    expect(ei.hasACL()).not.toBeTruthy(); // if fail: 'ACL present on created entry when no ACL was provided.');
    const aclInfo = { admin: [es.getEntryURI('_principals', 'admin')] };
    ei.setACL(aclInfo);
    expect(ei.hasACL()).toBeTruthy(); // if fail: 'No ACL present although it was just set.');
    await ei.commit();
    const acl = ei.getACL();
    expect(acl.admin.length).toBe(1); // if fail: 'ACL failed to save.'
    expect(acl.rread.length).toBe(0); // if fail: 'Local modifications of ACL after save operation remains.');

    aclInfo.rread = [es.getEntryURI('_principals', 'admin')];
    ei.setACL(aclInfo); // Make a local modification.
  });

  test('Create an entry using acl', async () => {
    const acl = { admin: [es.getEntryURI('_principals', 'admin')] };
    const entry = await context.newEntry().setACL(acl).commit();
    expect(entry.getEntryInfo().hasACL()).toBeTruthy(); // if fail: 'No ACL present although it was provided on create.');
  });

  test('Change resource uri of an entry', async () => {
    const uri = 'http://example.com';
    const uri2 = `${uri}/about`;
    const entry = await context.newLink(uri).commit();
    const ei = entry.getEntryInfo();
    ei.setResourceURI(uri2);
    expect(uri2).toBe(ei.getResourceURI()); // if fail: 'Failed to set new URI');
    await ei.commit();
    expect(ei.getResourceURI()).toBe(uri2); // If fail: 'Failed to save new URI, local change remains.');
    ei.setResourceURI(uri); // Resetting old uri, local change that should be reset after save.
  });


  test('Change external metadata uri of an entry', async () => {
    const res = 'http://slashdot.org';
    const mduri = 'http://example.com';
    const mduri2 = `${mduri}/about`;
    const entry = await context.newRef(res, mduri).commit();
    const ei = entry.getEntryInfo();
    ei.setExternalMetadataURI(mduri2);
    expect(ei.getExternalMetadataURI()).toBe(mduri2); // If fail: 'Failed to set new external metadata URI');
    await ei.commit();
    expect(ei.getExternalMetadataURI()).toBe(mduri2) // If fail: 'Failed to save new URI, local change remains.');
    ei.setExternalMetadataURI(mduri); // Resetting old uri, local change that should be reset after save.
  });

  test('Fetch metadata revisions', async () => {
    const entry = await context.newEntry().addL('dcterms:title', 'First').commit();
    expect(entry.getEntryInfo().getMetadataRevisions().length).toBe(1);
    entry.addL('dcterms:description', 'Second');

    const newEntry = await entry.commitMetadata();
    const ei = newEntry.getEntryInfo();
    const revs = ei.getMetadataRevisions();
    expect(revs.length).toBe(2);
    const graph = await ei.getMetadataRevisionGraph(revs[1].uri);

    // graph.findFirstValue(null, 'dcterms:description') returns undefined - is that what we want?
    expect(graph.findFirstValue(null, 'dcterms:description') == null).toBeTruthy();


    expect(newEntry.getMetadata().findFirstValue(null, 'dcterms:description')).not.toBeNull();

    // Should not be able to load non-existing versions:
    await expect(ei.getMetadataRevisionGraph(`${ei.getMetadataURI()}?rev=3`)).rejects.toThrow();
  });
});