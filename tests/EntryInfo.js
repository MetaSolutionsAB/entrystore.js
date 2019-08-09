const { Graph } = require('rdfjson');
const store = require('../dist/EntryStore.node');
const config = require('./config');

const es = new store.EntryStore(config.repository);
const context = es.getContextById('1');
let ready;
const now = new Date();
const yesterday = (new Date()).setDate(now.getDate() - 1);
const tomorrow = (new Date()).setDate(now.getDate() + 1);

exports.EntryInfo = {
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
  dates(test) {
    context.newEntry().create().then((entry) => {
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
            type: 'literal'
          }]
        }
      }))
        .commitMetadata().then(() => {
        test.ok(ei.getModificationDate() > mo, 'Modification date not changed after metadata was updated.');
        test.done();
      });
    });
  },
  creator(test) {
    es.getUserEntry().then((user) => {
      context.newEntry().create().then((entry) => {
        const ei = entry.getEntryInfo();
        test.ok(ei.getCreator() === user.getResourceURI(), 'Creator does not match current user.');
        test.done();
      });
    });
  },
  contributors(test) {
    es.getUserEntry().then((user) => {
      context.newEntry().create().then((entry) => {
        const contr = entry.getEntryInfo().getContributors();
        test.ok(contr.length === 1 && contr[0] === user.getResourceURI(), 'No contributors.');
        test.done();
      });
    });
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
  createWithACL(test) {
    const acl = { admin: [es.getEntryURI('_principals', 'admin')] };
    context.newEntry().setACL(acl).create().then((entry) => {
      test.ok(entry.getEntryInfo().hasACL(), 'No ACL present although it was provided on create.');
      test.done();
    });
  },
  changeResourceURI(test) {
    const uri = 'http://example.com';
    const uri2 = `${uri}/about`;
    context.newLink(uri).create().then((entry) => {
      const ei = entry.getEntryInfo();
      ei.setResourceURI(uri2);
      test.ok(uri2 === ei.getResourceURI(), 'Failed to set new URI');
      ei.commit().then(() => {
        test.ok(ei.getResourceURI() === uri2, 'Failed to save new URI, local change remains.');
        test.done();
      });
      ei.setResourceURI(uri); // Resetting old uri, local change that should be reset after save.
    });
  },
  changeExternalMetadataURI(test) {
    const res = 'http://slashdot.org';
    const mduri = 'http://example.com';
    const mduri2 = `${mduri}/about`;
    context.newRef(res, mduri).create().then((entry) => {
      const ei = entry.getEntryInfo();
      ei.setExternalMetadataURI(mduri2);
      test.ok(ei.getExternalMetadataURI() === mduri2, 'Failed to set new external metadata URI');
      ei.commit().then(() => {
        test.ok(ei.getExternalMetadataURI() === mduri2, 'Failed to save new URI, local change remains.');
        test.done();
      });
      ei.setExternalMetadataURI(mduri); // Resetting old uri, local change that should be reset after save.
    });
  },
  metadataRevisions(test) {
    const pe = context.newEntry().addL('dcterms:title', 'First').commit()
      .then((entry) => {
        test.ok(entry.getEntryInfo().getMetadataRevisions().length === 1);
        entry.addL('dcterms:description', 'Second');
        return entry.commitMetadata().then((entry) => {
          const ei = entry.getEntryInfo();
          const revs = ei.getMetadataRevisions();
          test.ok(revs.length === 2);
          return ei.getMetadataRevisionGraph(revs[1].uri).then((graph) => {
            test.ok(graph.findFirstValue(null, 'dcterms:description') == null);
            test.ok(entry.getMetadata().findFirstValue(null, 'dcterms:description') != null);
            return ei.getMetadataRevisionGraph(`${ei.getMetadataURI()}?rev=3`)
              .then(() => {
                test.ok(false, 'Should not be able to load non-existing versions');
                test.done();
              }, (err) => {
                test.done();
              });
          });
        });
      })
      .then(null, (err) => {
        test.ok(false, 'Problem creating entry or updating metadata in context 1');
        test.done();
      });
  },
};
