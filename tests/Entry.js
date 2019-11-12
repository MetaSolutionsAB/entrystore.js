const moment = require('moment');
const { Graph } = require('@entryscape/rdfjson');
const store = require('../dist/entrystore.node');
const config = require('./config');

const { repository, adminUser, adminPassword } = config;
let context;
let finished = false;
const dct = 'http://purl.org/dc/terms/';
const createEntryId1 = 'orange';
const createEntryId2 = 'apple1';
const MAX_AGE = 86400;

const setUp = async (callback) => {
  if (!context) {
    const es = new store.EntryStore(repository);
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

      const es = new store.EntryStore(repository);
      const auth = es.getAuth();
      await auth.logout();
    } catch (err) {
      // console.error(err);
    }
  }
  callback();
};


exports.Entry = {
  setUp,
  tearDown,
  async refresh(test) {
    const entry = await context.newEntry().commit();
    const graph = entry.getMetadata();
    graph.add(entry.getResourceURI(), `${dct}title`, { type: 'literal', value: 'Some title' });
    test.ok(!graph.isEmpty(), 'Could not change the metadata graph.');

    await entry.refresh(true, true);
    test.ok(entry.getMetadata().isEmpty(), 'Could not refresh, unsaved changes in metadata graph remains.');
    test.done();
  },
  async createEntry(test) {
    try {
      const entry = await context.newEntry().commit();
      test.ok(entry.getId() != null, 'Entry created but without id!');
      test.done();
    } catch (err) {
      test.ok(false, `Failed creating entry in context ${context.getId()}`);
      test.done();
    }
  },
  async createEntryWithId(test) {
    let appleEntry = null;
    try {
      appleEntry = await context.newEntry(createEntryId1).commit();
    } catch (err) {
      test.ok(false, `Failed to create a graph in context ${context.getId()}`);
      test.done();
      return;
    }
    test.ok(appleEntry.getId() === createEntryId1, `Entry could not be created with specific id "${createEntryId1}"!`);
    await appleEntry.del();

    try {
      const bananaEntry = await context.newEntry(createEntryId2).commit();
      test.ok(bananaEntry.getId() === createEntryId2, `Entry could not be created with specific id "${createEntryId2}"!`);
      await bananaEntry.del();
      test.done();
    } catch (err) {
      test.ok(false, 'Not allowed to create entry with id that already existed');
      test.done();
    }
  },
  async createNamedEntry(test) {
    try {
      const entry = await context.newNamedEntry().commit();
      test.ok(entry.getId() != null, 'Entry created but without id!');
      test.ok(entry.isNamedResource(), 'Entry but not as named resource!');
      test.done();
    } catch (err) {
      test.ok(false, `Failed creating entry in context ${context.getId()}`);
      test.done();
    }
  },
  async createWithMetadata(test) {
    const pe = context.newEntry();
    const uri = pe.getResourceURI();
    const graph = new Graph();
    graph.addL(uri, 'dcterms:title', 'Some title');
    pe.setMetadata(graph);
    try {
      const entry = await pe.commit();
      const md = entry.getMetadata();
      test.ok(md.findFirstValue(entry.getResourceURI(), 'dcterms:title') === 'Some title', 'Failed to create an entry with a title.');
      test.done();
    } catch (err) {
      test.ok(false, `Could not create an Entry in context ${context.getId()}`);
      test.done();
    }
  },
  async updateMetadata(test) {
    const entry = await context.newEntry().commit();
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
      const e1 = await context.newEntry().commit();
      await context.newEntry(e1.getId()).addL(`${dct}title`, 'Some title2').commitMetadata();
      test.done();
    } catch (err) {
      test.ok(false, 'Failed to update metadata via prototypeentry and a given entryid');
      test.done();
    }
  },
  async linkEntry(test) {
    const uri = 'http://example.com/';
    try {
      const entry = await context.newLink(uri).commit();
      test.ok(entry.isLink(), 'Failed to create a link.');
      test.ok(uri === entry.getResourceURI(), 'Failed to set resourceURI during creation step.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create link in context ${context.getId()}`);
      test.done();
    }
  },
  async linkRefEntry(test) {
    const uri = 'http://example.com/';
    try {
      const entry = await context.newLinkRef(uri, uri).commit();
      test.ok(entry.isLinkReference(), 'Failed to create a link-reference.');
      test.ok(uri === entry.getResourceURI(), 'Failed to set resourceURI during creation step.');
      test.ok(uri === entry.getEntryInfo().getExternalMetadataURI(),
        'Failed to set external metadatat URI during creation step.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create linkreference in context ${context.getId()}`);
      test.done();
    }
  },
  async refEntry(test) {
    const uri = 'http://example.com/';
    try {
      const entry = await context.newRef(uri, uri).commit();
      test.ok(entry.isReference(), 'Failed to create a reference.');
      test.ok(uri === entry.getResourceURI(), 'Failed to set resourceURI during creation step.');
      test.ok(uri === entry.getEntryInfo().getExternalMetadataURI(),
        'Failed to set external metadatat URI during creation step.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create a reference in context ${context.getId()}`);
      test.done();
    }
  },
  async listEntry(test) {
    try {
      const entry = await context.newList().commit();
      test.ok(entry.isList(), 'Entry created, but it is not a list as expected.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create a list in context ${context.getId()}`);
      test.done();
    }
  },
  async graphEntry(test) {
    const g = new Graph();
    g.add('http://example.com/', `${dct}title`, { type: 'literal', value: 'Some title1' });

    let entry = null;
    try {
      entry = await context.newGraph(g).commit();
      test.ok(entry.isGraph(), 'Entry created, but it is not a graph as expected.');
    } catch (err) {
      console.log(err);
      test.ok(false, `Failed to create a graph in context ${context.getId()}`);
      test.done();
      return;
    }

    let res = null;
    try {
      res = await entry.getResource();
      test.ok(res.getGraph().find().length === 1, 'The created graph Entry does save the provided graph upon creation');
    } catch (err) {
      console.log(err);
      test.ok(false, `Failed to create a graph in context ${context.getId()}`);
      test.done();
      return;
    }

    const g2 = new Graph();
    try {
      await res.setGraph(g2).commit();
      entry.setRefreshNeeded();
      await entry.refresh();
      test.ok(res.getGraph().isEmpty(), 'Failed to update ');
    } catch (err) {}
    test.done();

    g2.add('http://example.com/', `${dct}title`, { type: 'literal', value: 'Some title2' });
  },
  async updateGraphEntry(test) {
    let entry = null;
    try {
      entry = await context.newGraph().commit();
    } catch (err) {
      test.ok(false, `Failed to create a graph in context ${context.getId()}`);
      test.done();
      return;
    }
    const res = await entry.getResource();
    const g = new Graph();
    g.add('http://example.com/', `${dct}title`, { type: 'literal', value: 'Some title' });
    try {
      await res.setGraph(g).commit();
      test.ok(res.getGraph().find(null, `${dct}title`).length === 1, 'Statement added after save missing, should be there until refresh.');
    } catch (err) {
      test.ok(false, `Failed to update resource of entry graph. ${err}`);
      test.done();
    }
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
      const entry = await context.newString('one').commit();
      test.ok(entry.isString(), 'Entry created, but it is not a string as expected.');
      const res = await entry.getResource();
      test.ok(res.getString() === 'one', 'The created string entry does not have the string provided upon creation.');
      test.done();
    } catch (err) {
      test.ok(false, `Failed to create a string entry in context ${context.getId()}`);
      test.done();
    }
  },
  async updateStringEntry(test) {
    const str = 'a string';
    let entry = null;
    try {
      entry = await context.newString('').commit();
    } catch (err) {
      test.ok(false, `Failed to create a string entry in context ${context.getId()}`);
      test.done();
      return;
    }
    const res = await entry.getResource();
    test.ok(res.getString() === '', 'Empty string instead of null');
    try {
      await res.setString(str).commit();
    } catch (err) {
      test.ok(false, `Failed to update resource of string entry. ${err}`);
      test.done();
      return;
    }
    test.ok(res.getString() === str, 'String is not set correctly');
    await res.setString('').commit();
    entry.setRefreshNeeded();
    try {
      await entry.refresh();
      test.ok(res.getString() === '', 'Reload from repository gave wrong string');
    } catch (err) {
      test.ok(false, `Failed refreshing: ${err}`);
    }
    test.done();
  },
  async createWithCachedExternalMetadata(test) {
    const uri = 'http://example.com/';
    const graph = new Graph();
    graph.add(uri, `${dct}title`, { value: 'Some title', type: 'literal' });
    try {
      const entry = await context.newLinkRef(uri, uri).setCachedExternalMetadata(graph).commit();
      test.ok(!entry.getCachedExternalMetadata().isEmpty(), 'Failed to set cached external metadata in creation step.');
    } catch (err) {
      test.ok(false, `Failed to create Entry with cached external metadata in context ${context.getId()}`);
    }
    test.done();
  },
  async updateCachedExternalMetadata(test) {
    const uri = 'http://example.com/';
    const entry = await context.newRef(uri, uri).commit();
    const cachedExternalMetadata = entry.getCachedExternalMetadata();
    test.ok(cachedExternalMetadata.isEmpty(), 'New Link entry has non-empty cached external metadata, strange.');
    cachedExternalMetadata.add(entry.getResourceURI(), `${dct}title`, { value: 'A title', type: 'literal' });
    try {
      await entry.commitCachedExternalMetadata();
      test.ok(!cachedExternalMetadata.isEmpty(), 'Failed to save cached external metadata.');
    } catch (err) {
      test.ok(false, 'Something went wrong updating cachedExternalMetadata.');
    }
    test.done();
  },
  async ifUnModifiedSinceCheck(test) {
    let entry = null;
    try {
      entry = await context.newEntry().commit();
    } catch (err) {
      test.ok(false, `Could not create an Entry in context ${context.getId()}`);
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
    } catch (err) {}
    test.done();
    finished = true;
  },
};
