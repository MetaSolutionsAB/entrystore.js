import { NEW_ID_PLACEHOLDER } from './PrototypeEntry.js'
import Context from './Context.js';

/**
 * A not yet existing context (on the server). The context is accessible from a PrototypeContextEntry.
 * Allows creating initial prototype entries within the context even before the context is created (before commit).
 * When the context is created (via commit on its entry) all the initial entries are created as well (after the context is created).
 * The initial entries are available via the getInitialEntries method.
 *
 * The main functionality of this class are:
 *  1. to wrap all methods for creating entries so they are created in a later stage after the context has been created
 *  2. to rewrite all references between the entries after the context has been created with the right context id
 *  3. allow access to the initial entries after context creation
 *
 * @exports store/PrototypeContext
 */
export default class PrototypeContext extends Context {
  /**
   * @param {string} entryURI - URI to an entry where this resource is contained.
   * @param {string} resourceURI - URI to the resource.
   * @param {EntryStore} entryStore - the API's repository instance.
   */
  // eslint-disable-next-line no-useless-constructor
  constructor(entryURI, resourceURI, entryStore) {
    super(entryURI, resourceURI, entryStore);
    this.entryIdCounter = 0;
    this.id2pe = {};
  }

  /**
   * Creates an identifier if no explicit identifier is provided.
   * Currently the identifiers are created in numerical order.
   *
   * @param id
   * @return {string}
   * @private
   */
  _newId(id) {
    if (this.id2pe.hasOwnProperty(`${id}`)) {
      throw new Error('Id is already taken');
    }
    if (id === undefined) {
      this.entryIdCounter += 1;
      return `${this.entryIdCounter}`;
    } else {
      return `${id}`;
    }
  }

  /**
   * Utility method to simplify overriding of the superclass "new" methods.
   * @param {PrototypeEntry} pe
   * @return {PrototypeEntry}
   * @private
   */
  _register(pe) {
    this.id2pe[pe.getSpecificId()] = pe;
    pe.delayedCommit = pe.commit;
    pe.commit = () => {};
    return pe;
  }

  newEntry(id) {
    return this._register(super.newEntry(this._newId(id)));
  }

  newNamedEntry(id) {
    return this._register(super.newNamedEntry(this._newId(id)));
  }

  newLink(link, id) {
    return this._register(super.newLink(link, this._newId(id)));
  }

  newLinkRef(link, metadataLink, id) {
    return this._register(super.newLinkRef(link, metadataLink, this._newId(id)));
  }

  newRef(link, metadataLink, id) {
    return this._register(super.newRef(link, metadataLink, this._newId(id)));
  }

  newList(id) {
    return this._register(super.newList(this._newId(id)));
  }

  newGraph(graph = {}, id) {
    return this._register(super.newGraph(graph, this._newId(id)));
  }

  newString(str, id) {
    return this._register(super.newString(str, this._newId(id)));
  }

  newPipeline(id) {
    return this._register(super.newPipeline(this._newId(id)));
  }

  /**
   * Call this after the context has been created to update the initial prototype entries
   * so they can be created with the right context identifier.
   *
   * @param {Context} context
   */
  updateEntriesForCreatedContext(context) {
    const es = this.getEntryStore();
    const cru = context.getResourceURI();

    const oldBase = `${es.getBaseURI()}${NEW_ID_PLACEHOLDER}/`;
    const newBase = `${es.getBaseURI()}${context.getId()}/`;
    const uri2uri = {};
    Object.keys(this.id2pe).forEach(eid => {
      uri2uri[`${oldBase}resource/${eid}`] = `${newBase}resource/${eid}`;
      uri2uri[`${oldBase}entry/${eid}`] = `${newBase}entry/${eid}`;
      uri2uri[`${oldBase}metadata/${eid}`] = `${newBase}metadata/${eid}`;
      uri2uri[`${oldBase}cached-external-metadata/${eid}`] = `${newBase}cached-external-metadata/${eid}`;
    });

    Object.keys(this.id2pe).forEach(eid => {
      const pe = this.id2pe[eid];
      pe._context = context;        // Move over the prototype entry to the newly created context
      const ei = pe.getEntryInfo();
      const eidGraph = ei.getGraph();
      const md = pe.getMetadata();
      const cemd = pe.getCachedExternalMetadata();
      ei._entryURI = `${newBase}entry/${eid}`;       // Interal variable that needs to be updated
      Object.keys(uri2uri).forEach((fromURI => {
        const toURI = uri2uri[fromURI];
        md.replaceURI(fromURI, toURI);
        cemd.replaceURI(fromURI, toURI);
        eidGraph.replaceURI(fromURI, toURI);
      }));
    })
  }

  /**
   * Creates all the initial prototype entries in the context.
   *
   * @return {Promise<Entry[]>}
   */
  async createInitialEntries() {
    const pes = Object.values(this.id2pe);
    const proms = pes.map(pe => pe.delayedCommit());
    this._initialEntries = await Promise.all(proms);
    return this._initialEntries;
  }

  /**
   * @return {Entry[]}
   */
  getInitialEntries() {
    return this._initialEntries;
  }
};