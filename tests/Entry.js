const moment = require('moment');
const { Graph } = require('rdfjson');
const store = require('../dist/EntryStore.node');
const config = require('./config');

const es = new store.EntryStore(config.repository);
const c = es.getContextById('1');
let ready;
const dct = 'http://purl.org/dc/terms/';

exports.Entry = {
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
  refresh(test) {
    c.newEntry().commit().then((entry) => {
      const graph = entry.getMetadata();
      graph.add(entry.getResourceURI(), `${dct}title`, { type: 'literal', value: 'Some title' });
      test.ok(!graph.isEmpty(), 'Could not change the metadata graph.');
      entry.refresh(true, true).then(() => {
        test.ok(entry.getMetadata().isEmpty(), 'Could not refresh, unsaved changes in metadata graph remains.');
        test.done();
      });
    });
  },
  createEntry(test) {
    c.newEntry().commit().then((entry) => {
      test.ok(entry.getId() != null, 'Entry created but without id!');
      test.done();
    }, () => {
      test.ok(false, 'Failed creating entry in context 1.');
      test.done();
    });
  },
  createEntryWithId(test) {
    c.newEntry('tomato').commit().then((e1) => {
      test.ok(e1.getId() === 'tomato', 'Entry could not be created with specific id'
        + " 'tomato'!");
      return e1.del().then(() => {
        c.newEntry('tomato').commit().then((e2) => {
          test.ok(e2.getId() === 'tomato', 'Entry could not be created with specific id'
            + " 'banana'!");
          e2.del();
          test.done();
        }, () => {
          test.ok(false, 'Not allowed to create entry with id that already existed');
          test.done();
        });
      });
    }, () => {
      test.ok(false, "Failed creating entry with specific Id 'tomato' in context 1.");
      test.done();
    });
  },
  createNamedEntry(test) {
    c.newNamedEntry().commit().then((entry) => {
      test.ok(entry.getId() != null, 'Entry created but without id!');
      test.ok(entry.isNamedResource(), 'Entry but not as named resource!');
      test.done();
    }, () => {
      test.ok(false, 'Failed creating entry in context 1.');
      test.done();
    });
  },
  createWithMetadata(test) {
    const pe = c.newEntry();
    const uri = pe.getResourceURI();
    const graph = new Graph();
    graph.add(uri, `${dct}title`, { value: 'Some title', type: 'literal' });
    pe.setMetadata(graph);
    pe.commit().then((entry) => {
      const md = entry.getMetadata();
      test.ok(md.findFirstValue(entry.getResourceURI(), `${dct}title`) === 'Some title', 'Failed to create an entry with a title.');
      test.done();
    }, () => {
      test.ok(false, 'Could not create an Entry in Context 1.');
      test.done();
    });
  },
  updateMetadata(test) {
    const pe = c.newEntry().commit().then((entry) => {
      entry.getMetadata(true).add(entry.getResourceURI(), `${dct}title`, { type: 'literal', value: 'Some title2' });
      entry.commitMetadata().then(() => {
        entry.getMetadata().findAndRemove();
        test.ok(entry.getMetadata().findFirstValue(entry.getResourceURI(), `${dct}title`) == null, 'Could not clear the RDF graph.');
        entry.refresh(true, true).then(() => {
          test.ok(entry.getMetadata().findFirstValue(entry.getResourceURI(), `${dct}title`) === 'Some title2',
            'Failed to create and update the metadata with a new title.');
          test.done();
        });
      }, () => {
        test.ok(false, 'Could not save metadata for new entry!');
        test.done();
      });
    });
  },
  updateMetadataViaPrototype(test) {
    const pe = c.newEntry().commit().then(e1 => c.newEntry(e1.getId()).addL(`${dct}title`, 'Some title2').commitMetadata()).then(() => {
      test.done();
    }, () => {
      test.ok(false, 'Failed to update metadata via prototypeentry and a given entryid');
      test.done();
    });
  },
  linkEntry(test) {
    const uri = 'http://example.com/';
    c.newLink(uri).commit().then((entry) => {
      test.ok(entry.isLink(), 'Failed to create a link.');
      test.ok(uri == entry.getResourceURI(), 'Failed to set resourceURI during creation step.');
      test.done();
    }, () => {
      test.ok(false, 'Failed to create link in Context 1.');
      test.done();
    });
  },
  linkRefEntry(test) {
    const uri = 'http://example.com/';
    c.newLinkRef(uri, uri).commit().then((entry) => {
      test.ok(entry.isLinkReference(), 'Failed to create a link-reference.');
      test.ok(uri == entry.getResourceURI(), 'Failed to set resourceURI during creation step.');
      test.ok(uri == entry.getEntryInfo().getExternalMetadataURI(), 'Failed to set external metadatat URI during creation step.');
      test.done();
    }, () => {
      test.ok(false, 'Failed to create linkreference in Context 1.');
      test.done();
    });
  },

  refEntry(test) {
    const uri = 'http://example.com/';
    c.newRef(uri, uri).commit().then((entry) => {
      test.ok(entry.isReference(), 'Failed to create a reference.');
      test.ok(uri == entry.getResourceURI(), 'Failed to set resourceURI during creation step.');
      test.ok(uri == entry.getEntryInfo().getExternalMetadataURI(), 'Failed to set external metadatat URI during creation step.');
      test.done();
    }, () => {
      test.ok(false, 'Failed to create a reference in Context 1.');
      test.done();
    });
  },
  listEntry(test) {
    c.newList().commit().then((entry) => {
      test.ok(entry.isList(), 'Entry created, but it is not a list as expected.');
      test.done();
    }, () => {
      test.ok(false, 'Failed to create a list in Context 1.');
      test.done();
    });
  },
  graphEntry(test) {
    const g = new Graph();
    g.add('http://example.com/', `${dct}title`, { type: 'literal', value: 'Some title1' });

    c.newGraph(g).commit().then((entry) => {
      test.ok(entry.isGraph(), 'Entry created, but it is not a graph as expected.');
      entry.getResource().then((res) => {
        test.ok(res.getGraph().find().length === 1, 'The created graph Entry does save the provided graph upon creation');
        const g2 = new Graph();
        res.setGraph(g2).commit().then(() => {
          entry.setRefreshNeeded();
          entry.refresh().then(() => {
            test.ok(res.getGraph().isEmpty(), 'Failed to update ');
            test.done();
          });
        });
        g2.add('http://example.com/', `${dct}title`, { type: 'literal', value: 'Some title2' });
      }, (err) => {
        test.ok(false, 'Failed to load resource graph for graph entry.');
        test.done();
      });
    }, () => {
      test.ok(false, 'Failed to create a graph in Context 1.');
      test.done();
    });
  },
  updateGraphEntry(test) {
    c.newGraph().commit().then((entry) => {
      entry.getResource().then((res) => {
        const g = new Graph();
        g.add('http://example.com/', `${dct}title`, { type: 'literal', value: 'Some title' });
        res.setGraph(g).commit().then(() => {
          test.ok(res.getGraph().find(null, `${dct}subject`).length === 1, 'Statement added after save missing, should be there until refresh.');
          entry.setRefreshNeeded();
          entry.refresh().then(() => {
            test.ok(!res.getGraph().isEmpty(), 'Failed to update graph of graph entry');
            test.ok(res.getGraph().find(null, `${dct}subject`).length === 0, 'Statement added after save operation remains, strange.');
            test.done();
          }, (err) => {
            test.ok(false, `Failed refreshing: ${err}`);
            test.done();
          });
        }, (err) => {
          test.ok(false, `Failed to update resource of entry graph. ${err}`);
          test.done();
        });
        g.add('http://example.com/', `${dct}subject`, { type: 'literal', value: 'not good if it remains in graph after update' });
      });
    }, () => {
      test.ok(false, 'Failed to create a graph in Context 1.');
      test.done();
    });
  },
  stringEntry(test) {
    c.newString('one').commit().then((entry) => {
      test.ok(entry.isString(), 'Entry created, but it is not a string as expected.');
      entry.getResource().then((res) => {
        test.ok(res.getString() === 'one', 'The created string entry does not have the string provided upon creation.');
        test.done();
      });
    }, () => {
      test.ok(false, 'Failed to create a string entry in Context 1.');
      test.done();
    });
  },
  updateStringEntry(test) {
    const str = 'a string';
    c.newString().commit().then((entry) => {
      entry.getResource().then((res) => {
        test.ok(res.getString() === '', 'Empty string instead of null');
        res.setString(str).commit().then(() => {
          test.ok(res.getString() === str, 'String is not set correctly');
          res.setString('').commit().then(() => {
            entry.setRefreshNeeded();
            entry.refresh().then(() => {
              test.ok(res.getString() === '', 'Reload from repository gave wrong string');
              test.done();
            }, (err) => {
              test.ok(false, `Failed refreshing: ${err}`);
              test.done();
            });
          });
        }, (err) => {
          test.ok(false, `Failed to update resource of string entry. ${err}`);
          test.done();
        });
      });
    }, () => {
      test.ok(false, 'Failed to create a string entry in Context 1.');
      test.done();
    });
  },
  createWithCachedExternalMetadata(test) {
    const uri = 'http://example.com/';
    const graph = new Graph();
    graph.add(uri, `${dct}title`, { value: 'Some title', type: 'literal' });
    c.newLinkRef(uri, uri).setCachedExternalMetadata(graph).commit().then((entry) => {
      test.ok(!entry.getCachedExternalMetadata().isEmpty(), 'Failed to set cached external metadata in creation step.');
      test.done();
    }, () => {
      test.ok(false, 'Failed to create Entry with cached external metadata in Context 1.');
      test.done();
    });
  },

  updateCachedExternalMetadata(test) {
    const uri = 'http://example.com/';
    c.newRef(uri, uri).commit().then((entry) => {
      const cemd = entry.getCachedExternalMetadata();
      test.ok(cemd.isEmpty(), 'New Link entry has non-empty cached external metadata, strange.');
      cemd.add(entry.getResourceURI(), `${dct}title`, { value: 'A title', type: 'literal' });
      return entry.commitCachedExternalMetadata().then(() => {
        test.ok(!cemd.isEmpty(), 'Failed to save cached external metadata.');
        test.done();
      }, () => {
        test.ok(false, 'Something went wrong updating cachedExternalMetadata.');
        test.done();
      });
    });
  },

  ifUnModifiedSinceCheck(test) {
    c.newEntry().commit().then((entry) => {
      const md = entry.getMetadata();
      const uri = entry.getResourceURI();
      entry.getMetadata().addL(uri, 'dcterms:title', 'title1');
      entry.commitMetadata().then(() => {
        test.ok(entry.getMetadata().find(null, 'dcterms:title').length === 1, 'More than one title added, should not happen.');
      });

      // Manually set back the date of modification to force 412 status code.
      const eig = entry.getEntryInfo().getGraph();
      const stmt = eig.find(entry.getURI(), 'http://purl.org/dc/terms/modified')[0];
      stmt.setValue(moment(new Date('2000')).toISOString());

      entry.getMetadata().addL(uri, 'dcterms:title', 'title2');
      entry.commitMetadata().then(() => {
        test.ok(false, 'No conflict although saving metadata twice in a row');
      }, () => {
        test.done();
      });
    }, () => {
      test.ok(false, 'Could not create an Entry in Context 1.');
      test.done();
    });
  },
};
