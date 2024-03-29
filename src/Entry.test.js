import { Graph } from '@entryscape/rdfjson';
import init from '../tests/init.js';

const { context } = init();

const createEntryId1 = 'orange';
const createEntryId2 = 'apple1';

describe('Work with entries', () => {
  test('Add entry and refresh', async () => {
    const entry = await context().newEntry().commit();
    const graph = entry.getMetadata();
    graph.addL(entry.getResourceURI(), 'dcterms:title', 'Some title');
    expect(graph.isEmpty()).not.toBeTruthy(); // If fail: 'Could not change the metadata graph.');

    await entry.refresh(true, true);
    expect(entry.getMetadata().isEmpty()).toBeTruthy(); // If fail: 'Could not refresh, unsaved changes in metadata graph remains.');
  });


  test('Create an entry', async () => {
    const entry = await context().newEntry().commit();
    expect(entry.getId()).not.toBeNull(); // If fail: Entry created but without id!');
  });

  test('Create an entry using an id', async () => {
    const appleEntry = await context().newEntry(createEntryId1).commit();
    expect(appleEntry.getId()).toBe(createEntryId1); // If fail: `Entry could not be created with specific id "${createEntryId1}"!`);
    await appleEntry.del();
    const bananaEntry = await context().newEntry(createEntryId2).commit();
    expect(bananaEntry.getId()).toBe(createEntryId2); // If fail: `Entry could not be created with specific id "${createEntryId2}"!`);
    await bananaEntry.del();
  });


  test('Create a named entry', async () => {
    const entry = await context().newNamedEntry().commit();
    expect(entry.getId()).not.toBeNull(); // If fail: 'Entry created but without id!');
    expect(entry.isNamedResource()).toBeTruthy(); // If fail: 'Entry but not as named resource!');
  });

  test('Create an entry with metadata', async () => {
    const entry = await context().newEntry().addL('dcterms:title', 'Some title').commit();
    const md = entry.getMetadata();
    expect(md.findFirstValue(entry.getResourceURI(), 'dcterms:title')).toBe('Some title'); // If fail: 'Failed to create an entry with a title.');
  });

  test('All metadata in one graph', async () => {
    const prototypeEntry = context().newLinkRef("http://example.com", "http://example.com/metadata").addL('dcterms:title', 'Some title');
    const cemd = prototypeEntry.getCachedExternalMetadata();
    cemd.addL(prototypeEntry.getResourceURI(), 'dcterms:title', 'Another title');
    const allMDGraph = prototypeEntry.getAllMetadata();
    expect(allMDGraph.size()).toBe(2); // If fail: 'Failed to create an entry with a title.');
  });

  test('Update the metadata of an entry', async () => {
    const entry = await context().newEntry().commit();
    entry.getMetadata().add(entry.getResourceURI(), 'dcterms:title', {type: 'literal', value: 'Some title2'});
    await entry.commitMetadata();
    entry.getMetadata().findAndRemove();
    expect(entry.getMetadata().findFirstValue(entry.getResourceURI(), 'dcterms:title') == null).toBeTruthy(); // If fail: 'Could not clear the RDF graph.');
    await entry.refresh(true, true);
    expect(entry.getMetadata().findFirstValue(entry.getResourceURI(), 'dcterms:title')).toBe('Some title2'); // If fail: 'Failed to create and update the metadata with a new title.');
  });

  test('Update the metadata of an entry using prototype', async () => {
    expect.assertions(1);
    const e1 = await context().newEntry().commit();
    await context().newEntry(e1.getId()).addL('dcterms:title', 'Some title2').commitMetadata();
    expect(1).toBe(1);
  });

  test('Create a link entry', async () => {
    const uri = 'http://example.com/';
    const entry = await context().newLink(uri).commit();
    expect(entry.isLink()).toBeTruthy(); // If fail: 'Failed to create a link.');
    expect(entry.getResourceURI()).toBe(uri); // If fail: 'Failed to set resourceURI during creation step.');
  });

  test('Create a link-reference entry', async () => {
    const uri = 'http://example.com/';
    const entry = await context().newLinkRef(uri, uri).commit();
    expect(entry.isLinkReference()).toBeTruthy(); // If fail: 'Failed to create a link-reference.')
    expect(entry.getResourceURI()).toBe(uri); // If fail: 'Failed to set resourceURI during creation step.'
    expect(entry.getEntryInfo().getExternalMetadataURI()).toBe(uri); // If fail: 'Failed to set external metadatat URI during creation step.'
  });

  test('Create a reference entry', async () => {
    const uri = 'http://example.com/';
    const entry = await context().newRef(uri, uri).commit();
    expect(entry.isReference()).toBeTruthy(); // If fail: 'Failed to create a reference.'
    expect(entry.getResourceURI()).toBe(uri); // If fail: 'Failed to set resourceURI during creation step.');
    expect(entry.getEntryInfo().getExternalMetadataURI()).toBe(uri) // If fail:  'Failed to set external metadatat URI during creation step.');
  });


  test('Create a list entry', async () => {
    const entry = await context().newList().commit();
    expect(entry.isList()).toBeTruthy(); // If fail: 'Entry created, but it is not a list as expected.');
  });


  test('Create a graph entry', async () => {
    const g = new Graph();
    g.addL('http://example.com/', 'dcterms:title', 'Some title1');

    let entry = null;
    entry = await context().newGraph(g).commit();
    expect(entry.isGraph()).toBeTruthy(); // If fail: 'Entry created, but it is not a graph as expected.');

    const res = await entry.getResource();
    expect(res.getGraph().find().length).toBe(1); // If fail: 'The created graph Entry does save the provided graph upon creation');

    const g2 = new Graph();
    await res.setGraph(g2).commit();
    entry.setRefreshNeeded();
    await entry.refresh();
    expect(res.getGraph().isEmpty()).toBeTruthy(); // If fail: 'Failed to update ');

    g2.addL('http://example.com/', 'dcterms:title', 'Some title2');
  });

  test('Update graph entry', async () => {
    const entry = await context().newGraph().commit();
    const res = await entry.getResource();
    const g = new Graph();
    g.addL('http://example.com/', 'dcterms:title', 'Some title');

    await res.setGraph(g).commit();
    expect(res.getGraph().find(null, 'dcterms:title').length).toBe(1); // If fail: 'Statement added after save missing, should be there until refresh.');

    entry.setRefreshNeeded();
    await entry.refresh();
    expect(!res.getGraph().isEmpty()).toBeTruthy(); // If fail: 'Failed to update graph of graph entry');
    expect(res.getGraph().find(null, `dcterms:subject`).length).toBe(0); // If fail: 'Statement added after save operation remains, strange.');
  });

  test('Create a string entry', async () => {
    const entry = await context().newString('one').commit();
    expect(entry.isString()).toBeTruthy(); // If fail: 'Entry created, but it is not a string as expected.');
    const res = await entry.getResource();
    expect(res.getString()).toBe('one'); // If fail: 'The created string entry does not have the string provided upon creation.');
  });

  test('Update a string entry', async () => {
    expect.assertions(3);
    const str = 'a string';
    const entry = await context().newString('').commit();

    const res = await entry.getResource();
    expect(res.getString()).toBe(''); // If fail: 'Empty string instead of null');

    await res.setString(str).commit();

    expect(res.getString()).toBe(str); // If fail: 'String is not set correctly');
    await res.setString('').commit();
    entry.setRefreshNeeded();
    await entry.refresh();
    expect(res.getString()).toBe(''); // If fail: 'Reload from repository gave wrong string');
  });

  test('Create an entry with cached external metadata', async () => {
    const uri = 'http://example.com/';
    const graph = new Graph();
    graph.add(uri, 'dcterms:title', {value: 'Some title', type: 'literal'});
    const entry = await context().newLinkRef(uri, uri).setCachedExternalMetadata(graph).commit();
    expect(!entry.getCachedExternalMetadata().isEmpty()).toBeTruthy(); // If fail: 'Failed to set cached external metadata in creation step.');
  });

  test('Update an entry with cached external metadata', async () => {
    expect.assertions(2);
    const uri = 'http://example.com/';
    const entry = await context().newRef(uri, uri).commit();
    const cachedExternalMetadata = entry.getCachedExternalMetadata();
    expect(cachedExternalMetadata.isEmpty()).toBeTruthy(); // If fail: 'New Link entry has non-empty cached external metadata, strange.');
    cachedExternalMetadata.addL(entry.getResourceURI(), 'dcterms:title', 'A title');
    await entry.commitCachedExternalMetadata();
    expect(!cachedExternalMetadata.isEmpty()).toBeTruthy(); // If fail: 'Failed to save cached external metadata.');
  });

  test('Projection on an entry', async () => {
    expect.assertions(6); // number of assertions is actually six, and they all seem to execute, but jest only counts five?
    const entry = await context().newEntry().commit();
    const uri = entry.getResourceURI();
    entry.getMetadata().addL(uri, 'dcterms:title', 'title1');
    entry.getMetadata().addL(uri, 'dcterms:title', 'title2');
    await entry.commitMetadata();
    let titleProjection = entry.projection({
      title: 'dcterms:title',
    });

    expect(typeof titleProjection).toBe('object'); // if fail: 'Projection did not have a `title` property'

    expect('title' in titleProjection).toBeTruthy(); // if fail: 'Projection did not have a `title` property'

    expect(titleProjection.title === 'title1' || titleProjection.title === 'title2').toBeTruthy(); // If fail: 'Projection with single value was not correct.'

    titleProjection = entry.projection({
      '*titles': 'dcterms:title',
    });

    expect(Array.isArray(titleProjection.titles)).toBeTruthy(); // If fail: 'Projection with multiple values was not correct.');
    expect(titleProjection.titles.includes('title1')).toBeTruthy(); // If fail: 'Projection with multiple values was not correct.');
    expect(titleProjection.titles.includes('title2')).toBeTruthy(); // If fail: 'Projection with multiple values was not correct.');
  });
});



/**
 * @todo commented out since currently commitMetadata always refreshes the entry
 * So, there's no way to force this entry
 */
  // async ifUnModifiedSinceCheck(test) {
  //   let entry = null;
  //   try {
  //     entry = await context().newEntry().commit();
  //   } catch (err) {
  //     test.ok(false, `Could not create an Entry in context ${context().getId()}`);
  //     test.done();
  //     return;
  //   }
  //
  //   const uri = entry.getResourceURI();
  //   entry.getMetadata().addL(uri, 'dcterms:title', 'title1');
  //   await entry.commitMetadata();
  //   test.ok(entry.getMetadata().find(null, 'dcterms:title').length === 1,
  //     'More than one title added, should not happen.');
  //
  //   Manually set back the date of modification to force 412 status code.
  // const eig = entry.getEntryInfo().getGraph();
  // const stmt = eig.find(entry.getURI(), 'http://purl.org/dc/terms/modified')[0];
  // stmt.setValue(moment(new Date('2000')).toISOString());
  //
  // entry.getMetadata().addL(uri, 'dcterms:title', 'title2');
  // try {
  //   await entry.commitMetadata(true);
  //   test.ok(false, 'No conflict although saving metadata twice in a row');
  // } catch (err) {}
  // test.done();
  // finished = true;
  // },
