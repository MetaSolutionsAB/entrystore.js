const { EntryStore, terms } = require('../dist/entrystore.node');
const config = require('./config');

const es = new EntryStore(config.repository);
let authAdminReady = false;

exports.Inferred = {
  setUp(callback) {
    if (!authAdminReady) {
      es.getAuth().login('admin', 'adminadmin').then(() => {
        authAdminReady = true;
        callback();
      });
    } else {
      callback();
    }
  },
  inferredMetadata(test) {
    es.newContext().commit().then((contextEntry) => {
      const ei = contextEntry.getEntryInfo();
      ei.getGraph().addD(contextEntry.getResourceURI(),
        terms.reasoningFacts, 'true', 'xsd:boolean');
      return ei.commit().then(() => {
        const context = contextEntry.getResource(true);
        return context.newEntry().add('skos:broader', 'http://example.com').commit()
          .then(conceptEntry => es.newContext().commit().then((contextEntry2) => {
            const context2 = contextEntry2.getResource(true);
            return context2.newEntry().add('dcterms:subject', conceptEntry.getResourceURI())
              .commit().then((inferredEntry) => {
                const im = inferredEntry.getInferredMetadata();
                test.ok(im != null, 'No inferred metadata created.');
                if (im != null) {
                  test.ok(im.findFirstValue(null, 'dcterms:subject') === 'http://example.com',
                    'Inferred metadata does not contain expected tripple.');
                }
                test.done();
              });
          }));
      });
    }).then(null, (err) => {
      test.ok(false, `Error in test setup for inferred metadata: ${err.message}`);
      test.done();
    });
  },
};
