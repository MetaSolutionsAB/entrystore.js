import EntryStore from './EntryStore.js';
import config from '../tests/config.js';

const { repository, contextId, entryId, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const MAX_AGE = 86400;

async function logInlogOut() {
  await es.getAuth().logout();
  await es.getAuth().login(adminUser, adminPassword, MAX_AGE);
}

function isFirst(entry) {
  return entry.getMetadata().findFirstValue(null, 'dcterms:identifier') === '1';
}

describe('A signed in admin (user)', () => {
  beforeEach(() => {
    return logInlogOut();
  });

  test('Create a new context', async () => {
    expect.assertions(1);
    const entry = await es.newContext().commit();
    expect(entry.isContext()).toBeTruthy(); // If fail: Entry created, but it is not a context

  });

  test('Create a new context and entries within in one go', async () => {
    expect.assertions(3);
    const prototypeEntryContext = await es.newContext();
    const prototypeContext = prototypeEntryContext.getPrototypeContext();
    const pe1 = prototypeContext.newEntry().addL('dcterms:title', 'entry 1').addL('dcterms:identifier', '1');
    prototypeContext.newEntry().addL('dcterms:title', 'entry 2').add('dcterms:relation', pe1.getResourceURI());
    const contextEntry = await prototypeEntryContext.commit();
    const initialEntries = prototypeContext.getInitialEntries();
    expect(initialEntries.length).toBe(2);
    let first = initialEntries[0];
    let second = initialEntries[1];
    if (!isFirst(initialEntries[0])) {
      first = initialEntries[1];
      second = initialEntries[2];
    }
    expect(first.getContext().getId()).toBe(contextEntry.getId());
    expect(second.getMetadata().findFirstValue(null, 'dcterms:relation')).toBe(first.getResourceURI());
  });
});

