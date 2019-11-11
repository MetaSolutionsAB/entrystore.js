const { Graph } = require('@entryscape/rdfjson');
const store = require('../dist/entrystore.node');
const config = require('./config');

const { repository, adminUser, adminPassword } = config;
const es = new store.EntryStore(repository);
const now = new Date();
const yesterday = (new Date()).setDate(now.getDate() - 1);
const tomorrow = (new Date()).setDate(now.getDate() + 1);
let context;
let finished = false;
const MAX_AGE = 86400;

const setUp = async (callback) => {
  if (!context) {
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword, MAX_AGE);
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

      const auth = es.getAuth();
      await auth.logout();
    } catch (err) {
      // console.error(err);
    }
  }
  callback();
};
exports.EntryInfo = {
  setUp,
  tearDown,
  async dates(test) {
    const entry = await context.newEntry().commit();
    const ei = entry.getEntryInfo();
    const cr = ei.getCreationDate();
    test.ok(cr > yesterday && cr < tomorrow, 'Creation date seems to be incorrect.');
    const mo = ei.getModificationDate();
    test.ok(mo > yesterday && mo < tomorrow, 'Modification date seems to be incorrect');
    test.ok(mo >= cr, 'Modification date should be same as creation date after first creation.');
    entry.setMetadata(new Graph({
      'http://example.com': {
        'http://purl.org/dc/terms/title': [{
          value: 'A title',
          type: 'literal',
        }],
      },
    }));
    await entry.commitMetadata();
    test.ok(ei.getModificationDate() > mo, 'Modification date not changed after metadata was updated.');
    test.done();
  },
  async creator(test) {
    const user = await es.getUserEntry();
    const entry = await context.newEntry().commit();
    const ei = entry.getEntryInfo();
    test.ok(ei.getCreator() === user.getResourceURI(), 'Creator does not match current user.');
    test.done();
  },
  async contributors(test) {
    const user = await es.getUserEntry();
    const entry = await context.newEntry().commit();
    const contr = entry.getEntryInfo().getContributors();
    test.ok(contr.length === 1 && contr[0] === user.getResourceURI(), 'No contributors.');
    test.done();
  },
  async acl(test) {
    const entry = await context.newEntry().commit();
    const ei = entry.getEntryInfo();
    test.ok(!ei.hasACL(), 'ACL present on created entry when no ACL was provided.');
    const aclInfo = { admin: [es.getEntryURI('_principals', 'admin')] };
    ei.setACL(aclInfo);
    test.ok(ei.hasACL(), 'No ACL present although it was just set.');
    try {
      await ei.commit();
      const acl = ei.getACL();
      test.ok(acl.admin.length === 1, 'ACL failed to save.');
      test.ok(acl.rread.length === 0, 'Local modifications of ACL after save operation remains.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed updating ACL. ${err}`);
      test.done();
    }
    aclInfo.rread = [es.getEntryURI('_principals', 'admin')];
    ei.setACL(aclInfo); // Make a local modification.
  },
  async createWithACL(test) {
    const acl = { admin: [es.getEntryURI('_principals', 'admin')] };
    const entry = await context.newEntry().setACL(acl).commit();
    test.ok(entry.getEntryInfo().hasACL(), 'No ACL present although it was provided on create.');
    test.done();
  },
  async changeResourceURI(test) {
    const uri = 'http://example.com';
    const uri2 = `${uri}/about`;
    const entry = await context.newLink(uri).commit();
    const ei = entry.getEntryInfo();
    ei.setResourceURI(uri2);
    test.ok(uri2 === ei.getResourceURI(), 'Failed to set new URI');
    await ei.commit();
    test.ok(ei.getResourceURI() === uri2, 'Failed to save new URI, local change remains.');
    test.done();
    ei.setResourceURI(uri); // Resetting old uri, local change that should be reset after save.
  },
  async changeExternalMetadataURI(test) {
    const res = 'http://slashdot.org';
    const mduri = 'http://example.com';
    const mduri2 = `${mduri}/about`;
    const entry = await context.newRef(res, mduri).commit();
    const ei = entry.getEntryInfo();
    ei.setExternalMetadataURI(mduri2);
    test.ok(ei.getExternalMetadataURI() === mduri2, 'Failed to set new external metadata URI');
    await ei.commit();
    test.ok(ei.getExternalMetadataURI() === mduri2, 'Failed to save new URI, local change remains.');
    test.done();
    ei.setExternalMetadataURI(mduri); // Resetting old uri, local change that should be reset after save.
  },
  async metadataRevisions(test) {
    let entry;
    try {
      entry = await context.newEntry().addL('dcterms:title', 'First').commit();
      test.ok(entry.getEntryInfo().getMetadataRevisions().length === 1);
      entry.addL('dcterms:description', 'Second');
    } catch (err) {
      test.ok(false, 'Problem creating entry or updating metadata in context 1');
      test.done();
    }

    const newEntry = await entry.commitMetadata();
    const ei = newEntry.getEntryInfo();
    const revs = ei.getMetadataRevisions();
    test.ok(revs.length === 2);
    const graph = await ei.getMetadataRevisionGraph(revs[1].uri);
    test.ok(graph.findFirstValue(null, 'dcterms:description') == null);
    test.ok(newEntry.getMetadata().findFirstValue(null, 'dcterms:description') != null);
    try {
      const a = await ei.getMetadataRevisionGraph(`${ei.getMetadataURI()}?rev=3`);
      test.ok(false, 'Should not be able to load non-existing versions');
    } catch (err) {
    }
    test.done();
    finished = true;
  },
};
