import { namespaces } from '@entryscape/rdfjson';
import types from './types.js';
import init from '../tests/init.js';

const { entrystore, entrystoreutil } = init();

test('Search for specific title', async () => {
  const entries = await entrystore()
    .newSolrQuery()
    .title('Donald')
    .list()
    .getEntries(0);
  expect(entries.length).toBeGreaterThan(0); // If fail: "No entries found for title 'Donald', despite that we are searching against disney suite.");
});

// This test doesn't work using Nodeunit either..
test('Search for specific user name', async () => {
  const entries = await entrystore()
    .newSolrQuery()
    .username('donald')
    .list()
    .getEntries(0);
  expect(entries.length).toBeGreaterThan(0); // If fail:"No entries found for username 'donald', despite that we are searching against disney suite.");
});

test.skip('Search for a list', async () => {
  const entries = await entrystore()
    .newSolrQuery()
    .graphType(types.GT_LIST)
    .list()
    .getEntries(0);
  expect(entries.length).toBeGreaterThan(0); // If fail: 'No list found');
  expect(entries[0].isList()).toBeTruthy(); // If fail: 'Entry found was not a list');
});

test('Search for a user', async () => {
  const entries = await entrystore()
    .newSolrQuery()
    .graphType(types.GT_USER)
    .list()
    .getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isUser()).toBeTruthy(); // If fail: 'No users found, or entry found was not a user');
});

test('Check if there exists at leas one user which has specific user name', async () => {
  const entries = await entrystore()
    .newSolrQuery()
    .graphType(types.GT_USER)
    .title('Donald')
    .list()
    .getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isUser()).toBeTruthy(); // If fail:  'No users found with title "Donald" ' + '(assuming default test data in Entrystore), or entry found was not a user');
});

test('Search for a context', async () => {
  const entries = await entrystore()
    .newSolrQuery()
    .graphType(types.GT_CONTEXT)
    .list()
    .getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isContext()).toBeTruthy(); // If fail: 'No context found, or entry found was not a context');
});

test('Search for a link', async () => {
  const entries = await entrystore()
    .newSolrQuery()
    .entryType(types.ET_LINK)
    .limit(1)
    .list()
    .getEntries(0);
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].isLink()).toBeTruthy(); // If fail: 'No link found, or entry found was not a link');
});

test('Search for specific literal property', async () => {
  const titleEntry = await entrystore()
    .newSolrQuery()
    .literalProperty('dcterms:title', 'Donald')
    .list()
    .getEntries(0);
  const nameEntry = await entrystore()
    .newSolrQuery()
    .literalProperty('foaf:name', 'Donald')
    .list()
    .getEntries(0);
  const entries = [...titleEntry, ...nameEntry];
  expect(entries.length).toBeGreaterThan(0); // If fail: 'Cannot find title Donald via property search.');
});

describe('property sorts', () => {
  test.each([
    ['literalPropertySort', 'literal_s'],
    ['integerPropertySort', 'integer'],
    ['datePropertySort', 'date'],
  ])('%s sorts on the %s field of the predicate', (method, nodetype) => {
    const query = entrystore().newSolrQuery()[method]('dcterms:created');

    expect(query.getQuery()).toContain(
      `&sort=metadata.predicate.${nodetype}.f31288f4+asc`
    );
  });

  test('adds sorts in call order after the sort string', () => {
    const query = entrystore()
      .newSolrQuery()
      .sort('title.en+asc')
      .integerPropertySort('dcterms:created', 'desc')
      .literalPropertySort('schema:name', 'asc', true);

    expect(query.getQuery()).toContain(
      '&sort=title.en+asc,metadata.predicate.integer.f31288f4+desc,related.metadata.predicate.literal_s.fc0d21c7+asc'
    );
  });
});

test('Find two users by utilizing forEach functionality', async () => {
  let callbackCount = 0;
  let endReached = false;
  const totalCount = await entrystore()
    .newSolrQuery()
    .graphType(types.GT_USER)
    .limit(2)
    .list()
    .forEach((userEntry, idx) => {
      if (endReached) {
        // End function called before all callbacks.
      }
      expect(callbackCount).toBe(idx); // If fail: 'Callback index is wrong.');
      callbackCount += 1;
    });
  endReached = true;
  expect(callbackCount).toBe(totalCount); // If fail: 'Total count does not agree with amount of callbacks.');
});

test('Find two users by utilizing forEach functionality with breaks', async () => {
  const totalCount = await entrystore()
    .newSolrQuery()
    .graphType(types.GT_USER)
    .limit(2)
    .list()
    .forEach((userEntry, index) => {
      expect(index).toBeLessThan(3); // If fail: 'Callbacks continues after attempt to break.');
      return index !== 2;
    });
  expect(totalCount).toBe(3); // If fail: 'Total count is wrong, should be 3 as we stopped iteration after entry 3.');
});

test('Fetch entry by graph type', async () => {
  const entry = await entrystoreutil().getEntryByGraphType(types.GT_USER);
  expect(entry.isUser()).toBeTruthy();
});

test('joins top-level clauses with OR in a disjunctive query', () => {
  const query = entrystore()
    .newSolrQuery()
    .disjunctive()
    .title('banana')
    .description('tomato');

  expect(query.getQuery()).toContain(
    'query=title:banana+OR+description:tomato'
  );
});

test('Range literal query', async () => {
  const es = await entrystore();
  const q1 = es
    .newSolrQuery()
    .literalProperty('http://example.com/p', '[1 TO 2]', undefined, 'string');
  expect(q1.getQuery()).toMatch('[1%20TO%202]');
  const q2 = es
    .newSolrQuery()
    .literalProperty('http://example.com/p', '[1.2 TO *]', undefined, 'string');
  expect(q2.getQuery()).toMatch('[1.2%20TO%20*]');
  const q3 = es
    .newSolrQuery()
    .literalPropertyRange('http://example.com/p', '1', '2');
  expect(q3.getQuery()).toMatch('[1%20TO%202]');
});

test('searches the title in the given language', () => {
  const query = entrystore()
    .newSolrQuery()
    .titleWithLanguage('banana split', 'en');

  expect(query.getQuery()).toContain('query=title.en:(banana+AND+split)');
});

describe('contextType', () => {
  const catalogContext = 'http://entryscape.com/terms/CatalogContext';
  const workbenchContext = 'http://entryscape.com/terms/WorkbenchContext';
  const decode = (query) => decodeURIComponent(query.replace(/\+/g, ' '));
  const join = (contextTypes) =>
    `filter({!join from=resource to=context score=none v='graphType:Context AND rdfType:(${contextTypes})'})`;

  beforeAll(() => {
    namespaces.add('esterms', 'http://entryscape.com/terms/');
  });

  test('filters on one namespaced context type', () => {
    const query = entrystore()
      .newSolrQuery()
      .contextType('esterms:CatalogContext');

    expect(decode(query.getQuery())).toContain(
      `query=${join(`"${catalogContext}"`)}`
    );
  });

  test('ORs several context types inside the join', () => {
    const query = entrystore()
      .newSolrQuery()
      .contextType([catalogContext, workbenchContext]);

    expect(decode(query.getQuery())).toContain(
      join(`"${catalogContext}" OR "${workbenchContext}"`)
    );
  });

  test.each(['not', true])(
    'excludes the context types with modifier %s',
    (modifier) => {
      const query = entrystore()
        .newSolrQuery()
        .contextType(catalogContext, modifier);

      expect(decode(query.getQuery())).toContain(
        `query=NOT(${join(`"${catalogContext}"`)})`
      );
    }
  );

  test('escapes quotes and backslashes in the context types', () => {
    const query = entrystore()
      .newSolrQuery()
      .contextType("http://example.com/it's\\type");

    expect(decode(query.getQuery())).toContain(
      join(`"http://example.com/it\\'s\\\\type"`)
    );
  });

  test('sends no literal + inside the join', () => {
    const query = entrystore().newSolrQuery().contextType(catalogContext);

    expect(query.getQuery()).not.toContain('%2B');
  });

  test('ANDs the join with the rest of the query', () => {
    const query = entrystore()
      .newSolrQuery()
      .rdfType('dcat:Dataset')
      .contextType(catalogContext);

    expect(decode(query.getQuery())).toContain(
      `#Dataset AND ${join(`"${catalogContext}"`)}`
    );
  });

  test('ANDs the join with the OR:ed terms in a disjunctive query', () => {
    const query = entrystore()
      .newSolrQuery()
      .disjunctive()
      .title('banana')
      .description('tomato')
      .contextType(catalogContext);

    expect(decode(query.getQuery())).toContain(
      `query=(title:banana OR description:tomato) AND ${join(`"${catalogContext}"`)}`
    );
  });

  test.each([[[]], ['']])('adds nothing for %j', (contextType) => {
    const query = entrystore().newSolrQuery().contextType(contextType);

    expect(query.getQuery()).not.toContain('join');
  });
});
