import Entry from './Entry.js';
import EntryInfo from './EntryInfo.js';
import terms from './terms.js';

export const NEW_ID_PLACEHOLDER = '_newId';
/**
 * A PrototypeEntry is used to create new entries by collecting information about the initial
 * state of the entry to send along to the repository upon creation.
 *
 * All access and utility methods from Entry is just inherited. Some methods have been moved over
 * from EntryInformation to allow easier method chaining. Finally some information cannot be
 * changed in an entry, e.g. the entry, graph and resource types, but are crucial before creation.
 * Hence, some methods have been introduced to cover for this need.
 *
 * @exports store/PrototypeEntry
 */
export default class PrototypeEntry extends Entry {
  /**
   * @param {Context} context where this prototypeEntry belongs.
   * @param {string} id - entry identifier, if not unique in the context the subsequent commit
   * will fail.
   */
  constructor(context, id = NEW_ID_PLACEHOLDER) {
    const cru = context.getResourceURI();
    const entryInfo = new EntryInfo(`${cru}/entry/${id}`, null, context.getEntryStore());
    if (context.getId() === '_contexts') {
      entryInfo._resourceURI = context.getEntryStore().getBaseURI() + id;
    } else {
      entryInfo._resourceURI = `${cru}/resource/${id}`;
    }
    const oldSetResourceURI = entryInfo.setResourceURI.bind(entryInfo);
    entryInfo.setResourceURI = (uri) => {
      this._resourceURI = uri;
      oldSetResourceURI(uri);
      return this;
    };

    entryInfo.getResourceURI = () => this._resourceURI || entryInfo._resourceURI;

    super(context, entryInfo); // Call the super constructor.
    if (id !== NEW_ID_PLACEHOLDER) {
      this.specificId = id;
    }
  }

  /**
   * Direct access method for the resource instance for prorotypeEntries.
   * @returns {Resource}
   */
  getResource() {
    return this._resource;
  }

  /**
   * Exposes the {@link EntryInfo#setACL setACL} method from {@link EntryInfo}
   * on PrototypeEntry
   * and makes it chainable.
   *
   * @returns {PrototypeEntry} - to allow the method call to be chained.
   */
  setACL() {
    EntryInfo.prototype.setACL.apply(this._entryInfo, arguments);
    return this;
  }

  /**
   * Exposes the {@link EntryInfo#setResourceURI setResourceURI} method from
   * {@link EntryInfo} on this class
   * and makes it chainable.
   *
   * @returns {PrototypeEntry} - to allow the method call to be chained.
   */
  setResourceURI(uri) {
    this._entryInfo.setResourceURI(uri);
    return this;
  }

  /**
   * Exposes the {@link EntryInfo#setExternalMetadataURI setExternalMetadataURI} method
   * from {@link EntryInfo} on this class
   * and makes it chainable.
   *
   * @returns {PrototypeEntry} - to allow the method call to be chained.
   */
  setExternalMetadataURI(uri) {
    EntryInfo.prototype.setExternalMetadataURI.apply(this._entryInfo, arguments);
    return this;
  }

  /**
   * Makes it possible to change the EntryType (which is not allowed on existing entries).
   *
   * @returns {PrototypeEntry} - to allow the method call to be chained.
   */
  setEntryType(et) {
    const uri = terms.invEntryType[et];
    if (uri) {
      this._entryInfo.getGraph().create(this._entryInfo.getEntryURI(), terms.rdf.type, {
        type: 'uri',
        value: uri,
      });
    }
    return this;
  }

  /**
   * Makes it possible to change the GraphType (which is not allowed on existing entries).
   *
   * @returns {PrototypeEntry} - to allow the method call to be chained.
   */
  setGraphType(gt) {
    this._gt = gt;
    const uri = terms.invGraphType[gt];
    if (uri) {
      this._entryInfo.getGraph().create(this._entryInfo.getResourceURI(), terms.rdf.type, {
        type: 'uri',
        value: uri,
      });
    }
    return this;
  }

  /**
   * Makes it possible to change the ResourceType (which is not allowed on existing entries).
   *
   * @returns {PrototypeEntry} - to allow the method call to be chained.
   */
  setResourceType(rt) {
    const uri = terms.invResourceType[rt];
    if (uri) {
      this._entryInfo.getGraph().create(this._entryInfo.getResourceURI(), terms.rdf.type, {
        type: 'uri',
        value: uri,
      });
    }
    return this;
  }

  /**
   * When creating new entries a single parent list can be specified, hence we need a way to set
   * it in PrototypeEntry.
   *
   * @param {Entry} parentListEntry
   * @returns {PrototypeEntry} - to allow the method call to be chained.
   */
  setParentList(parentListEntry) {
    this.parentListEntry = parentListEntry;
    return this;
  }

  /**
   * Get the parent list (as an entry) for this PrototypeEntry.
   * @returns {Entry}
   */
  getParentList() {
    return this.parentListEntry;
  }

  /**
   * Get the suggested entry id for this PrototypeEntry
   * @returns {string}
   */
  getSpecificId() {
    return this.specificId;
  }

  /**
   * Allowed as a way to save metadata for an
   * entry that is assumed to exist with a given entry id.
   * @override
   */
  commitMetadata() {
    if (!this.specificId) {
      throw new Error('The entryId must have been specified for allowing metadata to be saved.');
    }
    const es = this.getEntryStore();

    return es.handleAsync(es.getREST().put(this.getEntryInfo().getMetadataURI(),
      JSON.stringify(this.getMetadata().exportRDFJSON())), 'commitMetadata');
  }

  /**
   * Allowed as a way to save cached external metadata for an entry that is assumed to
   * exist with a given entry id.
   * @override
   */
  commitCachedExternalMetadata() {
    if (!this.specificId) {
      throw new Error('The entryId must have been specified for allowing cached external metadata to be saved.');
    }
    const es = this.getEntryStore();
    return es.handleAsync(es.getREST().put(this.getEntryInfo().getCachedExternalMetadataURI(),
      JSON.stringify(this._cachedExternalMetadata.exportRDFJSON())), 'commitCachedExternalMetadata');
  }

  /**
   * @deprecated use {@link PrototypeEntry#commit commit} instead.
   * @returns {Promise.<Entry>}
   */
  create() {
    return this._context.getEntryStore().createEntry(this);
  }

  /**
   * Create a new entry according to the information specified in the prototype entry.
   *
   * @returns {Promise.<Entry>}
   * @see EntryStore#createEntry
   */
  commit() {
    return this._context.getEntryStore().createEntry(this);
  }
};
