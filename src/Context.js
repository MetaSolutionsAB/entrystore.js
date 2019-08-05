import GraphResource from './Graph';
import Pipeline from './Pipeline';
import PrototypeEntry from './PrototypeEntry';
import Resource from './Resource';
import StringResource from './String';
import types from './types';

/**
 * Methods for interacting with the EntryStore repository scoped to a specific context.
 *
 * @exports store/Context
 */
export default class Context extends Resource {
  /**
   * Retrieves a list of entries in the context.
   *
   * @param {Object} sort - same sort object as provided in the optionalLoadParams to
   * {@see store/EntryStore#getEntry getEntry} method.
   * @param {Object} limit - same limit as provided in the optionalLoadParams to
   * {@see store/EntryStore#getEntry getEntry} method.
   * @param {integer} page - unless limit is set to -1 (no pagination) we need to specify
   * which page to load, first page is 0.
   * @returns {Promise.<store/Entry[]>} upon success the promise returns an array of entries.
   * @see store/EntryStore#getListEntries
   */
  listEntries(sort, limit, page) {
    return this.getEntryStore().getListEntries(`${this._resourceURI}/entry/_all`, sort, limit, page);
  }

  /**
   * Convenience method, to retrieve an entry from this context.
   *
   * @param {string} entryId
   * @param {object} optionalLoadParams same parameter as in {@see store/EntryStore#getEntry}
   * @returns {Promise.<store/Entry>}
   * @see store/EntryStore#getEntry
   */
  getEntryById(entryId, optionalLoadParams = {}) {
    return this.getEntryStore().getEntry(this.getEntryURIbyId(entryId), optionalLoadParams);
  }

  /**
   * Expands the given entry id into a full URI.
   *
   * @param {string} entryId
   * @returns {string} the URI for an entry in this context with the given id.
   */
  getEntryURIbyId(entryId) {
    return this.getEntryStore().getEntryURI(this.getId(), entryId);
  }

  /**
   * Factory method to create a PrototypeEntry that has the current context as container.
   * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it
   * (returns a promise).
   *
   * @param {string=} id - id for the entry, fails after commit if an entry exists already with
   * this id.
   * @returns {store/PrototypeEntry}
   */
  newEntry(id) {
    return new PrototypeEntry(this, id);
  }

  /**
   * Factory method to create a PrototypeEntry that corresponds to a local named resource that
   * has the current context as container.
   * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it
   * (returns a promise).
   *
   * @param {string=} id - id for the entry, fails after commit if an entry exists already
   * with this id.
   * @returns {store/PrototypeEntry}
   */
  newNamedEntry(id) {
    return new PrototypeEntry(this, id).setResourceType(types.RT_NAMEDRESOURCE);
  }

  /**
   * Factory method to create a PrototypeEntry that corresponds to a link that has the
   * current context as container.
   * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create
   * it (returns a promise).
   *
   * @param {string} link - the URI for the resource we are making a link to, mandatory.
   * @param {string=} id - id for the entry, fails after commit if an entry exists already
   * with this id.
   * @returns {store/PrototypeEntry}
   */
  newLink(link, id) {
    return new PrototypeEntry(this, id).setResourceURI(link).setEntryType(types.ET_LINK);
  }

  /**
   * Factory method to create a PrototypeEntry that is a linkref that has the current context
   * as container. Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to
   * actually create it (returns a promise).
   *
   * @param {string} link - is the URI for the resource we are making a link to, mandatory.
   * @param {string} metadataLink - is the URI for the metadata are referring to, mandatory.
   * @param {string=} id - id for the entry, fails after commit if an entry exists already
   * with this id.
   * @returns {store/PrototypeEntry}
   */
  newLinkRef(link, metadataLink, id) {
    return new PrototypeEntry(this, id)
      .setResourceURI(link)
      .setExternalMetadataURI(metadataLink)
      .setEntryType(types.ET_LINKREF);
  }

  /**
   * Factory method to create a PrototypeEntry that is a reference and has the current
   * context as container. Call {@link store/PrototypeEntry#commit commit} on the
   * PrototypeEntry to actually create it (returns a promise).
   * The only difference to the newLinkRef method is that the EntryType is Reference instead
   * of LinkReference which implies that there is no local metadata.
   *
   * @param {string} link - the URI for the resource we are making a link to, mandatory.
   * @param {string} metadataLink - the URI for the metadata are referring to, mandatory.
   * @param {string=} id for the entry, fails after commit if an entry exists already with
   * this id.
   * @returns {store/PrototypeEntry}
   */
  newRef(link, metadataLink, id) {
    return new PrototypeEntry(this, id)
      .setResourceURI(link)
      .setExternalMetadataURI(metadataLink)
      .setEntryType(types.ET_REF);
  }

  /**
   * Factory method to create a PrototypeEntry whose resource is a {@link store/List List)
   * and has the current context as container.
   * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create
   * it (returns a promise).
   *
   * @param {string} id an optional id for the entry, fails on commit if an entry exists already
   * with this id.
   * @returns {store/PrototypeEntry}
   */
  newList(id) {
    return new PrototypeEntry(this, id).setGraphType(types.GT_LIST);
  }

  /**
   * Factory method to create a PrototypeEntry whose resource is a {@link store/Graph Graph}
   * and has the current context as container.
   * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it
   * (returns a promise).
   *
   * @param {rdfjson/Graph} graph - graph to store as a resource.
   * @param {string=} id - id for the entry, fails upon commit if an entry exists already
   * with this id.
   * @returns {store/PrototypeEntry}
   */
  newGraph(graph, id) {
    const prototypeEntry = new PrototypeEntry(this, id).setGraphType(types.GT_GRAPH);
    const entryInfo = prototypeEntry.getEntryInfo();
    prototypeEntry._resource = new GraphResource(entryInfo.getEntryURI(), entryInfo.getResourceURI(),
      this.getEntryStore(), graph || {});

    return prototypeEntry;
  }

  /**
   * Factory method to create a PrototypeEntry whose resource is a {@link store/String String}
   * that has the current context as container.
   * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create
   * it (returns a promise).
   *
   * @param {string=} str an optional string for the String Resource.
   * @param {String} id an optional id for the entry, fails upon commit if an entry exists
   * already with this id.
   * @returns {store/PrototypeEntry}
   */
  newString(str, id) {
    const prototypeEntry = new PrototypeEntry(this, id).setGraphType(types.GT_STRING);
    const entryInfo = prototypeEntry.getEntryInfo();
    prototypeEntry._resource = new StringResource(entryInfo.getEntryURI(),
      entryInfo.getResourceURI(), this.getEntryStore(), str);

    return prototypeEntry;
  }

  /**
   * Factory method to create a PrototypeEntry whose resource is a
   * {@link store/Pipeline pipeline} that has the current context as container.
   * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it
   * (returns a promise).
   *
   * @param {String} id an optional id for the entry, fails upon commit if an entry exists
   * already with this id.
   * @returns {store/PrototypeEntry}
   */
  newPipeline(id) {
    const prototypeEntry = new PrototypeEntry(this, id).setGraphType(types.GT_PIPELINE);
    const entryInfo = prototypeEntry.getEntryInfo();
    prototypeEntry._resource = new Pipeline(entryInfo.getEntryURI(), entryInfo.getResourceURI(), this.getEntryStore(), {});

    return prototypeEntry;
  }

  /**
   * The name for this context.
   *
   * @returns {string}
   */
  getName() {
    return this._name;
  }

  /**
   * Change of context name, succeeds if name is not in use already by another context.
   * @param {string} name
   * @returns {Promise}
   */
  setName(name) {
    const oldName = this._name;
    this._name = name;
    return this.getEntryStore().handleAsync(this.getEntryStore().getREST()
      .put(`${this.getEntryURI()}/name`, JSON.stringify({ name })).then((data) => {
        const entry = this.getEntry(true);
        if (entry) {
          entry.getEntryInfo()._name = data;
        }
        return data;
      }, (e) => {
        this._name = oldName;
        throw e;
      }), 'setContextName');
  }

  /**
   * Finds the user or group that has this context as homecontext if any.
   *
   * @returns {Promise.<store/Entry>} if succeeds if context a homecontext of some user or group.
   */
  getHomeContextOf() {
    return this.getEntry().then((contextEntry) => {
      const es = contextEntry.getEntryStore();
      const groupResourceArr = contextEntry.getReferrers('store:homeContext');
      if (groupResourceArr.length > 0) {
        return es.getEntry(es.getEntryURIFromURI(groupResourceArr[0]));
      }
      throw new Error('No user or group that has this context as home context');
    });
  }

  _update(data) {
    this._name = data.alias || data.name; // TODO, change to only name after clean-up
  }
};
