const { EntryStore, EntryStoreUtil, types } = require('../dist/EntryStore.node');
const config = require('./config');

const es = new EntryStore(config.repository);
const esu = new EntryStoreUtil(es);
const context = es.getContextById('1');
let ready;

exports.solr = {
  setUp(callback) {
    if (!ready) {
      es.getAuth().login('admin', 'adminadmin').then(() => {
        ready = true;
        callback();
      });
    } else {
      callback();
    }
  },
  titleSearch(test) {
    es.newSolrQuery().title('Donald').list().getEntries(0)
      .then((entries) => {
        test.ok(entries.length > 0, "No entries found for title 'Donald', despite that we are searching against disney suite.");
        test.done();
      }, () => {
        test.ok(false, 'Failed performing the search, REST call went wrong.');
      });
  },
  listSearch(test) {
    es.newSolrQuery().graphType(types.GT_LIST).list().getEntries(0)
      .then((entries) => {
        test.ok(entries.length > 0 && entries[0].isList(), 'No lists found, or entry found was not a list');
        test.done();
      }, () => {
        test.ok(false, 'Failed performing the search, REST call went wrong.');
      });
  },
  userSearch(test) {
    es.newSolrQuery().graphType(types.GT_USER).list().getEntries(0)
      .then((entries) => {
        test.ok(entries.length > 0 && entries[0].isUser(), 'No users found, or entry found was not a user');
        test.done();
      }, () => {
        test.ok(false, 'Failed performing the search, REST call went wrong.');
      });
  },
  userAndTitleSearch(test) {
    es.newSolrQuery().graphType(types.GT_USER).title('Donald').list()
      .getEntries(0)
      .then((entries) => {
        test.ok(entries.length > 0 && entries[0].isUser(), 'No users found, or entry found was not a user');
        test.done();
      }, () => {
        test.ok(false, 'Failed performing the search, REST call went wrong.');
      });
  },
  contextSearch(test) {
    es.newSolrQuery().graphType(types.GT_CONTEXT).list().getEntries(0)
      .then((entries) => {
        test.ok(entries.length > 0 && entries[0].isContext(), 'No context found, or entry found was not a context');
        test.done();
      }, () => {
        test.ok(false, 'Failed performing the search, REST call went wrong.');
      });
  },
  linkSearch(test) {
    es.newSolrQuery().entryType(types.ET_LINK).list().getEntries(0)
      .then((entries) => {
        test.ok(entries.length > 0 && entries[0].isLink(), 'No link found, or entry found was not a link');
        test.done();
      }, () => {
        test.ok(false, 'Failed performing the search, REST call went wrong.');
      });
  },
  literalPropertySearch(test) {
    es.newSolrQuery()
      .literalProperty('dcterms:title', 'Donald')
      .list().getEntries(0)
      .then((entries) => {
        test.ok(entries.length > 0, 'Cannot find title Donald via property search.');
        test.done();
      }, (err) => {
        test.ok(false, `Failed performing the search, REST call went wrong: ${err}`);
        test.done();
      });
  },
  forEachSearch(test) {
    let callbackCount = 0; let
      endReached = false;
    es.newSolrQuery().graphType(types.GT_USER).limit(2).list()
      .forEach((userEntry, idx) => {
        if (endReached) {
          test.ok(false, 'End function called before all callbacks.');
        }
        test.ok(callbackCount === idx, 'Callback index is wrong.');
        callbackCount++;
      })
      .then((totalCount) => {
        endReached = true;
        test.ok(callbackCount === totalCount, 'Total count does not agree with amount of callbacks.');
        test.done();
      }, (err) => {
        test.ok(false, `Got error callback from promise unexpectedly: ${err}`);
        test.done();
      });
  },
  forEachSearchBreak(test) {
    es.newSolrQuery().graphType(types.GT_USER).limit(2).list()
      .forEach((userEntry, index) => {
        test.ok(index < 3, 'Callbacks continues after attempt to break.');
        return index !== 2;
      })
      .then((totalCount) => {
        test.ok(totalCount === 3, 'Total count is wrong, should be 3 as we stopped iteration after entry 3.');
        test.done();
      }, (err) => {
        test.ok(false, `Got error callback from promise unexpectedly: ${err}`);
        test.done();
      });
  },
  getByGraphType(test) {
    esu.getEntryByGraphType(types.GT_USER).then(() => {
      test.done();
    }, () => {
      test.ok(false, 'We should be able to find at least one user.');
      test.done();
    });
  },
};
