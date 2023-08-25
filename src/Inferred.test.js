import EntryStore from './EntryStore.js';
import terms from './terms.js';
import config from '../tests/config.js';

const es = new EntryStore(config.repository);
let authAdminReady = false;


async function setUp() {
  if (!authAdminReady) {
    es.getAuth().login('admin', 'adminadmin').then(() => {
      authAdminReady = true;
    });
  } else {
  }
};

beforeAll(setUp);

test('A dummy test', () => {
  expect(1).toBeTruthy();
});

/*
** Inferred src file not ready for testing yet
**
**
test('inferredMetadata', () => {
    expect.assertions(2);
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
                  expect(im).not.toBeNull(); // If fail: 'No inferred metadata created.'
                  if (im != null) {
                    expect(im.findFirstValue(null, 'dcterms:subject')).toBe('http://example.com'); // If fail: 'Inferred metadata does not contain expected tripple.');
                  }
                  test.done();
                });
            }));
        });
      }).then(null, (err) => {
      });
});
*/

