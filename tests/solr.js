const { EntryStore, EntryStoreUtil, types } = require('../dist/EntryStore.node');
const config = require('./config');

const { repository, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const esu = new EntryStoreUtil(es);
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
exports.solr = {
  setUp,
  tearDown,
  async titleSearch(test) {
    try {
      test.ok(entries.length > 0, "No entries found for title 'Donald', despite that we are searching against disney suite.");
    } catch (err) {
      test.ok(false, 'Failed performing the search, REST call went wrong.');
    }
    test.done();
  },
  async listSearch(test) {
    try {
      const entries = await es.newSolrQuery().graphType(types.GT_LIST).list().getEntries(0);
      test.ok(entries.length > 0 && entries[0].isList(), 'No lists found, or entry found was not a list');
    } catch (err) {
      test.ok(false, 'Failed performing the search, REST call went wrong.');
    }
    test.done();
  },
  async userSearch(test) {
    try {
      const entries = await es.newSolrQuery().graphType(types.GT_USER).list().getEntries(0);
      test.ok(entries.length > 0 && entries[0].isUser(), 'No users found, or entry found was not a user');
    } catch (err) {
      test.ok(false, 'Failed performing the search, REST call went wrong.');
    }
    test.done();
  },
  async userAndTitleSearch(test) {
    try {
      const entries = await es.newSolrQuery().graphType(types.GT_USER).title('Donald').list().getEntries(0);
      test.ok(entries.length > 0 && entries[0].isUser(), 'No users found, or entry found was not a user');
    } catch (err) {
      test.ok(false, 'Failed performing the search, REST call went wrong.');
    }
    test.done();
  },
  async contextSearch(test) {
    try {
      const entries = await es.newSolrQuery().graphType(types.GT_CONTEXT).list().getEntries(0);
      test.ok(entries.length > 0 && entries[0].isContext(), 'No context found, or entry found was not a context');
    } catch (err) {
      test.ok(false, 'Failed performing the search, REST call went wrong.');
    }
    test.done();
  },
  async linkSearch(test) {
    try {
      const entries = await es.newSolrQuery().entryType(types.ET_LINK).list().getEntries(0);
      test.ok(entries.length > 0 && entries[0].isLink(), 'No link found, or entry found was not a link');
    } catch (err) {
      test.ok(false, 'Failed performing the search, REST call went wrong.');
    }
    test.done();
  },
  async literalPropertySearch(test) {
    try {
      const entries = await es.newSolrQuery().literalProperty('dcterms:title', 'Donald').list().getEntries(0);
      test.ok(entries.length > 0, 'Cannot find title Donald via property search.');
    } catch (err) {
      test.ok(false, `Failed performing the search, REST call went wrong: ${err}`);
    }
    test.done();
  },
  async forEachSearch(test) {
    let callbackCount = 0;
    let endReached = false;
    try {
      const totalCount = await es.newSolrQuery().graphType(types.GT_USER).limit(2).list()
        .forEach((userEntry, idx) => {
          if (endReached) {
            test.ok(false, 'End function called before all callbacks.');
          }
          test.ok(callbackCount === idx, 'Callback index is wrong.');
          callbackCount++;
        });
      endReached = true;
      test.ok(callbackCount === totalCount, 'Total count does not agree with amount of callbacks.');
    } catch (err) {
      test.ok(false, `Got error callback from promise unexpectedly: ${err}`);
    }
    test.done();
  },
  async forEachSearchBreak(test) {
    try {
      const totalCount = await es.newSolrQuery().graphType(types.GT_USER).limit(2).list()
        .forEach((userEntry, index) => {
          test.ok(index < 3, 'Callbacks continues after attempt to break.');
          return index !== 2;
        });
      test.ok(totalCount === 3, 'Total count is wrong, should be 3 as we stopped iteration after entry 3.');
    } catch (err) {
      test.ok(false, `Got error callback from promise unexpectedly: ${err}`);
    }
    test.done();
  },
  async getByGraphType(test) {
    try {
      await esu.getEntryByGraphType(types.GT_USER);
    } catch (err) {
      test.ok(false, 'We should be able to find at least one user.');
    }
    test.done();
    finished = true;
  },
};
