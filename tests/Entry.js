const moment = require('moment');
const { Graph } = require('rdfjson');
const store = require('../dist/EntryStore.node');
const config = require('./config');

const { repository, contextId, adminUser, adminPassword } = config;
const es = new store.EntryStore(repository);
const c = es.getContextById(contextId);
const dct = 'http://purl.org/dc/terms/';

exports.Entry = {
  async setUp(callback) {
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword, 6987);
    callback();
  },
  async refresh(test) {
    const entry = await c.newEntry().commit();
    const graph = entry.getMetadata();
    graph.add(entry.getResourceURI(), `${dct}title`, { type: 'literal', value: 'Some title' });
    test.ok(!graph.isEmpty(), 'Could not change the metadata graph.');

    await entry.refresh(true, true);
    test.ok(entry.getMetadata().isEmpty(), 'Could not refresh, unsaved changes in metadata graph remains.');
    test.done();
  },
  async createEntry(test) {
    try {
      const entry = await c.newEntry().commit();
      test.ok(entry.getId() != null, 'Entry created but without id!');
      test.done();
    } catch (err) {
      test.ok(false, `Failed creating entry in context ${contextId}`);
      test.done();
    }
  },
  async createEntryWithId(test) {
    let appleEntry = null;
    try {
      appleEntry = await c.newEntry('apple').commit();
    } catch (err) {
      test.ok(false, `Failed to create a graph in context ${contextId}`);
      test.done();
      return;
    }
    test.ok(appleEntry.getId() === 'apple', 'Entry could not be created with specific id "apple"!');
    await appleEntry.del();

    try {
      const bananaEntry = c.newEntry('banana').commit();
      test.ok(bananaEntry.getId() === 'banana', 'Entry could not be created with specific id "banana"!');
      bananaEntry.del();
      test.done();
    } catch (err) {
      test.ok(false, 'Not allowed to create entry with id that already existed');
      test.done();
    }
  },
  async createNamedEntry(test) {
    try {
      const entry = await c.newNamedEntry().commit();
      test.ok(entry.getId() != null, 'Entry created but without id!');
      test.ok(entry.isNamedResource(), 'Entry but not as named resource!');
      test.done();
    } catch (err) {
      test.ok(false, `Failed creating entry in context ${contextId}`);
      test.done();
    }
  },
  async createWithMetadata(test) {
    const pe = c.newEntry();
    const uri = pe.getResourceURI();
    const graph = new Graph();
    graph.add(uri, `${dct}title`, { value: 'Some title', type: 'literal' });
    pe.setMetadata(graph);
    try {
      const entry = await pe.commit();
      const md = entry.getMetadata();
      test.ok(md.findFirstValue(entry.getResourceURI(), `${dct}title`) === 'Some title', 'Failed to create an entry with a title.');
      test.done();
    } catch (err) {
      test.ok(false, `Could not create an Entry in context ${contextId}`);
      test.done();
    }
  },
  async updateMetadata(test) {
    const entry = await c.newEntry().commit();
    entry.getMetadata().add(entry.getResourceURI(), `${dct}title`, { type: 'literal', value: 'Some title2' });
    try {
      await entry.commitMetadata();
      entry.getMetadata().findAndRemove();
      test.ok(entry.getMetadata().findFirstValue(entry.getResourceURI(), `${dct}title`) == null, 'Could not clear the RDF graph.');
      await entry.refresh(true, true);
      test.ok(entry.getMetadata().findFirstValue(entry.getResourceURI(), `${dct}title`) === 'Some title2',
        'Failed to create and update the metadata with a new title.');
      test.done();
    } catch (err) {
      test.ok(false, 'Could not save metadata for new entry!');
      test.done();
    }
  },
  async updateMetadataViaPrototype(test) {
    try {
      const e1 = await c.newEntry().commit();
      await c.newEntry(e1.getId()).addL(`${dct}title`, 'Some title2').commitMetadata();
      test.done();
    } catch (err) {
      test.ok(false, 'Failed to update metadata via prototypeentry and a given entryid');
      test.done();
    }
  },
  async linkEntry(test) {
    const uri = 'http://example.com/';
    try {
      const entry = await c.newLink(uri).commit();
      test.ok(entry.isLink(), 'Failed to create a link.');
      test.ok(uri === entry.getResourceURI(), 'Failed to set resourceURI during creation step.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create link in context ${contextId}`);
      test.done();
    }
  },
  async linkRefEntry(test) {
    const uri = 'http://example.com/';
    try {
      const entry = await c.newLinkRef(uri, uri).commit();
      test.ok(entry.isLinkReference(), 'Failed to create a link-reference.');
      test.ok(uri === entry.getResourceURI(), 'Failed to set resourceURI during creation step.');
      test.ok(uri === entry.getEntryInfo().getExternalMetadataURI(),
        'Failed to set external metadatat URI during creation step.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create linkreference in context ${contextId}`);
      test.done();
    }
  },
  async refEntry(test) {
    const uri = 'http://example.com/';
    try {
      const entry = await c.newRef(uri, uri).commit();
      test.ok(entry.isReference(), 'Failed to create a reference.');
      test.ok(uri === entry.getResourceURI(), 'Failed to set resourceURI during creation step.');
      test.ok(uri === entry.getEntryInfo().getExternalMetadataURI(),
        'Failed to set external metadatat URI during creation step.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create a reference in context ${contextId}`);
      test.done();
    }
  },
  async listEntry(test) {
    try {
      const entry = await c.newList().commit();
      test.ok(entry.isList(), 'Entry created, but it is not a list as expected.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create a list in context ${contextId}`);
      test.done();
    }
  },
  async graphEntry(test) {
    const g = new Graph();
    g.add('http://example.com/', `${dct}title`, { type: 'literal', value: 'Some title1' });

    let entry = null;
    try {
      entry = await c.newGraph(g).commit();
    } catch (err) {
      test.ok(false, `Failed to create a graph in context ${contextId}`);
      test.done();
      return;
    }
    test.ok(entry.isGraph(), 'Entry created, but it is not a graph as expected.');

    let res = null;
    try {
      res = await entry.getResource();
    } catch (err) {
      test.ok(false, `Failed to create a graph in context ${contextId}`);
      test.done();
      return;
    }

    test.ok(res.getGraph().find().length === 1, 'The created graph Entry does save the provided graph upon creation');
    const g2 = new Graph();
    await res.setGraph(g2).commit();
    entry.setRefreshNeeded();
    await entry.refresh();
    test.ok(res.getGraph().isEmpty(), 'Failed to update ');
    test.done();

    g2.add('http://example.com/', `${dct}title`, { type: 'literal', value: 'Some title2' });
  },
  async updateGraphEntry(test) {
    let entry = null;
    try {
      entry = c.newGraph().commit();
    } catch (err) {
      test.ok(false, `Failed to create a graph in context ${contextId}`);
      test.done();
      return;
    }
    const res = await entry.getResource();
    const g = new Graph();
    g.add('http://example.com/', `${dct}title`, { type: 'literal', value: 'Some title' });
    try {
      await res.setGraph(g).commit();
    } catch (err) {
      test.ok(false, `Failed to update resource of entry graph. ${err}`);
      test.done();
    }
    test.ok(res.getGraph().find(null, `${dct}subject`).length === 1, 'Statement added after save missing, should be there until refresh.');
    entry.setRefreshNeeded();
    try {
      await entry.refresh();
      test.ok(!res.getGraph().isEmpty(), 'Failed to update graph of graph entry');
      test.ok(res.getGraph().find(null, `${dct}subject`).length === 0, 'Statement added after save operation remains, strange.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed refreshing: ${err}`);
      test.done();
    }
    g.add('http://example.com/', `${dct}subject`, {
      type: 'literal',
      value: 'not good if it remains in graph after update',
    });
  },
  async stringEntry(test) {
    try {
      const entry = await c.newString('one').commit();
      test.ok(entry.isString(), 'Entry created, but it is not a string as expected.');
      const res = await entry.getResource();
      test.ok(res.getString() === 'one', 'The created string entry does not have the string provided upon creation.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create a string entry in context ${contextId}`);
      test.done();
    }
  },
  async updateStringEntry(test) {
    const str = 'a string';
    let entry = null;
    try {
      entry = await c.newString('').commit();
    } catch (err) {
      test.ok(false, `Failed to create a string entry in context ${contextId}`);
      test.done();
      return;
    }
    test.ok(false, `Failed to update resource of string entry. ${err}`);
    test.done();
    const res = await entry.getResource();
    test.ok(res.getString() === '', 'Empty string instead of null');
    try {
      await res.setString(str).commit();
    } catch (err) {
      test.ok(false, `Failed to update resource of string entry. ${err}`);
      test.done();
    }
    test.ok(res.getString() === str, 'String is not set correctly');
    await res.setString('').commit();
    entry.setRefreshNeeded();
    try {
      await entry.refresh();
      test.ok(res.getString() === '', 'Reload from repository gave wrong string');
      test.done();
    } catch (err) {
      test.ok(false, `Failed refreshing: ${err}`);
      test.done();
    }
  },
  async createWithCachedExternalMetadata(test) {
    const uri = 'http://example.com/';
    const graph = new Graph();
    graph.add(uri, `${dct}title`, { value: 'Some title', type: 'literal' });
    try {
      const entry = await c.newLinkRef(uri, uri).setCachedExternalMetadata(graph).commit();
      test.ok(!entry.getCachedExternalMetadata().isEmpty(), 'Failed to set cached external metadata in creation step.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create Entry with cached external metadata in context ${contextId}`);
      test.done();
    }
  },
  async updateCachedExternalMetadata(test) {
    const uri = 'http://example.com/';
    const entry = await c.newRef(uri, uri).commit();
    const cachedExternalMetadata = entry.getCachedExternalMetadata();
    test.ok(cachedExternalMetadata.isEmpty(), 'New Link entry has non-empty cached external metadata, strange.');
    cachedExternalMetadata.add(entry.getResourceURI(), `${dct}title`, { value: 'A title', type: 'literal' });
    try {
      await entry.commitCachedExternalMetadata();
      test.ok(!cachedExternalMetadata.isEmpty(), 'Failed to save cached external metadata.');
      test.done();
    } catch (err) {
      test.ok(false, 'Something went wrong updating cachedExternalMetadata.');
      test.done();
    }
  },
  async ifUnModifiedSinceCheck(test) {
    let entry = null;
    try {
      entry = await c.newEntry().commit();
    } catch (err) {
      test.ok(false, `Could not create an Entry in context ${contextId}`);
      test.done();
      return;
    }
    const uri = entry.getResourceURI();
    entry.getMetadata().addL(uri, 'dcterms:title', 'title1');
    await entry.commitMetadata();
    test.ok(entry.getMetadata().find(null, 'dcterms:title').length === 1,
      'More than one title added, should not happen.');

    // Manually set back the date of modification to force 412 status code.
    const eig = entry.getEntryInfo().getGraph();
    const stmt = eig.find(entry.getURI(), 'http://purl.org/dc/terms/modified')[0];
    stmt.setValue(moment(new Date('2000')).toISOString());

    entry.getMetadata().addL(uri, 'dcterms:title', 'title2');
    try {
      await entry.commitMetadata();
      test.ok(false, 'No conflict although saving metadata twice in a row');
    } catch (err) {
      test.done();
    }
  },
};
