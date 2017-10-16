define([
  'store/Entry',
  'store/EntryInfo',
  'store/terms',
], (Entry, EntryInfo, terms) =>
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
   * @param {store/Context} context where this prototypeEntry belongs.
   * @param {string} id - entry identifier, if not unique in the context the subsequent commit will
   * fail
   * @class
   * @augments store/Entry
   */
  class extends Entry {
    constructor(context, id) {
      const _id = id || '_newId';
      const cru = context.getResourceURI();
      const entryInfo = new EntryInfo(`${cru}/entry/${_id}`, null, context.getEntryStore());
      if (context.getId() === '_contexts') {
        entryInfo._resourceURI = context.getEntryStore().getBaseURI() + _id;
      } else {
        entryInfo._resourceURI = `${cru}/resource/${_id}`;
      }
      const oldSetResourceURI = entryInfo.setResourceURI;
      entryInfo.setResourceURI = function (uri) {
        this._resourceURI = uri;
        oldSetResourceURI.call(this, uri);
      };
      entryInfo.getResourceURI = function () {
        return this._resourceURI;
      };

      super(context, entryInfo); // Call the super constructor.
      if (id != null) {
        this.specificId = _id;
      }
    }

    /**
     * Direct access method for the resource instance for prorotypeEntries.
     * @returns {store/Resource}
     */
    getResource() {
      return this._resource;
    }

    /**
     * Exposes the {@link store/EntryInfo#setACL setACL} method from {@link store/EntryInfo}
     * on PrototypeEntry
     * and makes it chainable.
     *
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    setACL() {
      EntryInfo.prototype.setACL.apply(this._entryInfo, arguments);
      return this;
    }

    /**
     * Exposes the {@link store/EntryInfo#setResourceURI setResourceURI} method from
     * {@link store/EntryInfo} on this class
     * and makes it chainable.
     *
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    setResourceURI() {
      this._entryInfo.setResourceURI(...arguments);
      return this;
    }

    /**
     * Exposes the {@link store/EntryInfo#setExternalMetadataURI setExternalMetadataURI} method
     * from {@link store/EntryInfo} on this class
     * and makes it chainable.
     *
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    setExternalMetadataURI() {
      EntryInfo.prototype.setExternalMetadataURI.apply(this._entryInfo, arguments);
      return this;
    }

    /**
     * Makes it possible to change the EntryType (which is not allowed on existing entries).
     *
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
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
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
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
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
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
     * @param {store/Entry} parentListEntry
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    setParentList(parentListEntry) {
      this.parentListEntry = parentListEntry;
      return this;
    }

    /**
     * Get the parent list (as an entry) for this PrototypeEntry.
     * @returns {store/Entry}
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
     * Committing just metadata not allowed on a PrototypeEntry since there is no
     * entry in the repository yet. Use commit to create the entire entry instead.
     * @override
     */
    static commitMetadata() {
      throw new Error('Not supported on PrototypeEntry, call commit instead.');
    }

    /**
     * Committing just cached external metadata is not allowed on a PrototypeEntry since there is no
     * entry in the repository yet. Use commit to create the entire entry instead.
     * @override
     */
    static commitCachedExternalMetadata() {
      throw new Error('Not supported on PrototypeEntry, call commit instead.');
    }

    /**
     * @deprecated use {@link store/PrototypeEntry#commit commit} instead.
     * @returns {entryPromise}
     */
    create() {
      return this._context.getEntryStore().createEntry(this);
    }

    /**
     * Create a new entry according to the information specified in the prototype entry.
     *
     * @returns {entryPromise}
     * @see store/EntryStore#createEntry
     */
    commit() {
      return this._context.getEntryStore().createEntry(this);
    }
  });
