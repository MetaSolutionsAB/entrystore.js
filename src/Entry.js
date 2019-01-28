  import { Graph } from 'rdfjson';
  import types from './types';

  /**
   * Entrys are at the center of this API. Entrys holds together metadata, external metadata,
   * resources, access control, and provenance. Hence, entrys appear in the majority of methods,
   * either directly or in callbacks via promises. Each entry has a simple identifier within a
   * context and a globally unique URI that can be used to load, store and index the entry.
   *
   * Many of the methods in this class are convenience methods that allows the developer to interact
   * with the information retrieved from the repository without digging through the RDF graphs.
   * For instance, all methods starting with _can_ or _is_ are convenience methods for working
   * with access control or the type information available in the associated
   * {@link store/EntryInformation} class. The same is true for the majority of the get methods,
   * only those that have corresponding set methods are really unique for this class.
   *
   * @exports store/Entry
   */
  class Entry {
    /**
     * @param {store/Context} context container for this entry
     * @param {store/EntryInfo} entryInfo defines the basics of this entry
     */
    constructor(context, entryInfo) {
      this._context = context;
      this._entryInfo = entryInfo;
      this._entryInfo._entry = this;
    }

    /**
     * @returns {store/EntryStore}
     */
    getEntryStore() {
      return this._context.getEntryStore();
    }

    /**
     * @returns {store/EntryInfo}
     */
    getEntryInfo() {
      return this._entryInfo;
    }

    /**
     * Convenience method, same as calling entry.getEntryInfo().getEntryURI()
     * @return {string} the entry uri.
     * @see store/EntryInfo#getEntryURI
     */
    getURI() {
      return this._entryInfo.getEntryURI();
    }

    /**
     * Convenience method, same as calling entry.getEntryInfo().getId()
     * @returns {string} the id of the entry
     * @see store/EntryInfo#getId
     */
    getId() {
      return this._entryInfo.getId();
    }

    /**
     * Convenience method, same as calling entry.getEntryInfo().getResourceURI()
     * @returns {string} a URI to the resource of this entry.
     */
    getResourceURI() {
      return this._entryInfo.getResourceURI();
    }

    /**
     * @returns {store/Context}
     */
    getContext() {
      return this._context;
    }

    /**
     * Provides an RDF graph as an {@link rdfjson/Graph} instance.
     * @return {rdfjson/Graph} a RDF graph with metadata, typically containing statements about
     * the resourceURI. The returned graph may be empty but never null or undefined.
     */
    getMetadata() {
      if (this._metadata == null) {
        this._metadata = new Graph();
      }
      return this._metadata;
    }

    /**
     * Sets a new metadata graph for this entry without pushing it to the repository.
     * In many cases this method is not needed since you can get the metadata graph,
     * modify it and then commit the changes directly.
     *
     * However, in some cases you need to set a new metadata graph, e.g.
     * you want to overwrite the metadata with a new graph retrieved from another source or the
     * entry have been refreshed with new information and you want to commit the merged results.
     * In these cases you need to discard the current metadata graph with help of this method.
     *
     * @param {rdfjson/Graph} graph is an RDF graph with metadata, if it is not provided the current
     * metadata graph is saved (there is currently no check whether it has been modified or not).
     * @return store/Entry - to allow chaining with other methods, e.g. with commitMetadata.
     */
    setMetadata(graph) {
      this._metadata = graph;
      return this;
    }

    /**
     * Will push the metadata for this entry to the repository.
     * If metadata has been set for an entry with EntryType 'reference'
     * the entrytype will change to 'linkreference' upon a successful commit.
     * @params {boolean} ignoreIfUnmodifiedSinceCheck if explicitly set to true no check is done
     * if information is stale, also it will not automatically refresh with the latest date
     * @return {entryPromise} a promise that on success will contain the current updated entry.
     */
    commitMetadata(ignoreIfUnmodifiedSinceCheck) {
      let p;
      const es = this.getEntryStore();
      if (this.isReference()) {
        p = Promise.reject(`Entry "${this.getURI()}" is a reference and have no local metadata that can be saved.`);
      } else if (!this.canWriteMetadata()) {
        p = Promise.reject(`You do not have sufficient access rights to save metadata on entry "${this.getURI()}".`);
      } else if (this.needRefresh()) {
        p = Promise.reject(`The entry "${this.getURI()}" need to be refreshed before its local metadata can be saved.\n` +
          'This message indicates that the client is written poorly, this case should have been taken into account.');
      } else if (this._metadata == null) {
        p = Promise.reject(`The entry "${this.getURI()}" should allow local metadata to be saved, but there is no local metadata.\nThis message is a bug in the storejs API.`);
      } else {
        if (ignoreIfUnmodifiedSinceCheck) {
          p = es.getREST().put(this.getEntryInfo().getMetadataURI(),
            JSON.stringify(this._metadata.exportRDFJSON())).then(() => this);
        }
        const mod = this.getEntryInfo().getModificationDate();
        p = es.getREST().put(this.getEntryInfo().getMetadataURI(),
          JSON.stringify(this._metadata.exportRDFJSON()), mod)
          .then(() => {
            this.setRefreshNeeded(true);
            return this.refresh().then(() => this, () => {
              // Failed refreshing, but succeded at saving metadata,
              // at least send out message that it needs to be refreshed.
              this.getEntryStore().getCache().message('refreshed', this);
              return this;
            });
          });
      }
      return es.handleAsync(p, 'commitMetadata');
    }

    /**
     * Same as entry.getMetadata().add(entry.getResourceURI(), pred, o)
     * but instead of returning the created statement it returns the entry itself,
     * allowing chained method calls.
     *
     * @param {string} pred the predicate
     * @param {object} o the object
     * @returns {module:store/Entry}
     */
    add(pred, o) {
      this.getMetadata().add(this.getResourceURI(), pred, o);
      return this;
    }

    /**
     * Same as entry.getMetadata().addL(entry.getResourceURI(), pred, lit, lang)
     * but instead of returning the created statement it returns the entry itself,
     * allowing chained method calls.
     *
     * @param {string} pred the predicate
     * @param {string} lit the literal value
     * @param {string} language an optional language
     * @returns {module:store/Entry}
     */
    addL(pred, lit, langugage) {
      this.getMetadata().addL(this.getResourceURI(), pred, lit, langugage);
      return this;
    }

    /**
     * Same as entry.getMetadata().addD(entry.getResourceURI(), pred, lit, lang)
     * but instead of returning the created statement it returns the entry itself,
     * allowing chained method calls.
     *
     * @param {string} pred the predicate
     * @param {string} lit the literal value
     * @param {string} dt the datatype (should be a string)
     * @returns {module:store/Entry}
     */
    addD(pred, lit, dt) {
      this.getMetadata().addD(this.getResourceURI(), pred, lit, dt);
      return this;
    }

    /**
     * Cached external metadata can only be provided for entries with entrytype
     * reference or linkreference.
     *
     * @return {rdfjson/Graph} - a RDF graph with cached external metadata, typically containing
     * statements about the resourceURI. The returned graph may be empty but never null
     * or undefined.
     */
    getCachedExternalMetadata() {
      if (this._cachedExternalMetadata == null) {
        this._cachedExternalMetadata = new Graph();
      }

      return this._cachedExternalMetadata;
    }

    getInferredMetadata() {
      return this._inferredMetadata;
    }

    /**
     * Sets a new cached external metadata graph for this entry without pushing
     * it to the repository.
     *
     * @param {rdfjson/Graph} graph is an RDF graph with metadata.
     * @return store/Entry - to allow chaining with other methods,
     * e.g. with commitCachedExternalMetadata.
     */
    setCachedExternalMetadata(graph) {
      this._cachedExternalMetadata = graph || this._cachedExternalMetadata;
      return this;
    }

    /**
     * Pushes the current cached external metadata graph for this entry to the repository.
     *
     * @return {entryPromise} a promise that on success will contain the current updated entry.
     */
    commitCachedExternalMetadata() {
      const self = this;
      const es = this.getEntryStore();
      const mod = this.getEntryInfo().getModificationDate();
      const d = es.getREST().put(this.getEntryInfo().getCachedExternalMetadataURI(),
        JSON.stringify(this._cachedExternalMetadata.exportRDFJSON()), mod)
        .then(() => {
          self.setRefreshNeeded(true);
          return self.refresh().then(() => self, () => {
            // Failed refreshing, but succeded at saving metadata,
            // at least send out message that it needs to be refreshed.
            self.getEntryStore().getCache().message('refreshed', self);
            return self;
          });
        });
      return es.handleAsync(d, 'commitCachedExternalMetadata');
    }

    /**
     * @todo remains to be supported in repository
     * @returns {rdfjson/Graph}
     */
    getExtractedMetadata() {
      if (this._extractedMetadata == null) {
        this._extractedMetadata = new Graph();
      }
      return this._extractedMetadata;
    }

    /**
     * Provides the resource for this entry if it exists in a promise,
     * e.g. if the graph-type is not none.
     * It is also possible to request the resource directly, i.e. get the resource rather
     * than a promise. This is achieved by specifying the "direct" parameter as true.
     * This always work for Lists, Groups, and Context resources.
     * For all other resources it will work if the resource, e.g. a Graph,
     * a String etc. is already loaded. If it is not loaded null will be returned.
     *
     * @returns {store/Resource|resourcePromise}
     */
    getResource(direct) {
      if (direct) {
        return this._resource;
      }
      const es = this.getEntryStore();
      let p;
      if (this._resource) {
        p = Promise.resolve(this._resource);
      } else {
        const format = this.isString() ? 'text' : undefined;
        p = es.getREST().get(this.getResourceURI(), format).then((data) => {
          es.getFactory().updateOrCreateResource(this, { resource: data }, true);
          return this._resource;
        });
      }
      return es.handleAsync(p, 'getResource');
    }

    /**
     * @returns {rdfjson/Graph}
     */
    getReferrersGraph() {
      return this._relation;
    }

    /**
     * a list of URIs that has referred to this Entry using various properties.
     *
     * @param {string} prop
     * @returns {string[]}
     */
    getReferrers(prop) {
      return this._relation.find(null, prop, null).map(stmt => stmt.getSubject());
    }

    /**
     * a list of entry URIs corresponding to list entries where this entry is contained.
     * @returns {string[]}
     */
    getParentLists() {
      const listResourceURIArr = this.getReferrers('http://entrystore.org/terms/hasListMember');
      return listResourceURIArr.map(resURI =>
        this.getEntryStore().getFactory().getEntryURIFromURI(this.getEntryStore(), resURI), this);
    }

    /**
     * a list of entry URIs corresponding to groups where this user entry is member.
     * @returns {string[]}
     */
    getParentGroups() {
      const groupResourceURIArr = this.getReferrers('http://entrystore.org/terms/hasGroupMember');
      return groupResourceURIArr.map(resURI =>
        this.getEntryStore().getFactory().getEntryURIFromURI(this.getEntryStore(), resURI), this);
    }

    /**
     * a list of comments (i.e. their URIs) of this entry.
     * @returns {string[]}
     */
    getComments() {
      return this.getReferrers('http://ontologi.es/like#regarding');
    }

    /**
     * Is the resource of this entry of the GraphType list?
     * @returns {boolean}
     */
    isList() {
      return this.getEntryInfo().getGraphType() === types.GT_LIST;
    }

    /**
     * Is the resource of this entry of the Graphtype resultlist?
     * @returns {boolean}
     */
    isResultList() {
      return this.getEntryInfo().getGraphType() === types.GT_RESULTLIST;
    }

    /**
     * Is the resource of this entry of the GraphType context?
     * @returns {boolean}
     */
    isContext() {
      return this.getEntryInfo().getGraphType() === types.GT_CONTEXT;
    }

    /**
     * Is the resource of this entry of the GraphType systemcontext?
     * @returns {boolean}
     */
    isSystemContext() {
      return this.getEntryInfo().getGraphType() === types.GT_SYSTEMCONTEXT;
    }

    /**
     * Is the resource of this entry of the GraphType user?
     * @returns {boolean}
     */
    isUser() {
      return this.getEntryInfo().getGraphType() === types.GT_USER;
    }

    /**
     * Is the resource of this entry of the GraphType group?
     * @returns {boolean}
     */
    isGroup() {
      return this.getEntryInfo().getGraphType() === types.GT_GROUP;
    }

    /**
     * Is the resource of this entry of the GraphType graph?
     * @returns {boolean}
     */
    isGraph() {
      return this.getEntryInfo().getGraphType() === types.GT_GRAPH;
    }

    /**
     * Is the resource of this entry of the GraphType pipeline?
     * @returns {boolean}
     */
    isPipeline() {
      return this.getEntryInfo().getGraphType() === types.GT_PIPELINE;
    }

    /**
     * Is the resource of this entry of the GraphType pipelineresult?
     * @returns {boolean}
     */
    isPipelineResult() {
      return this.getEntryInfo().getGraphType() === types.GT_PIPELINERESULT;
    }

    /**
     * Is the resource of this entry of the GraphType string?
     * @returns {boolean}
     */
    isString() {
      return this.getEntryInfo().getGraphType() === types.GT_STRING;
    }

    /**
     * Is the resource of this entry of the GraphType none?
     * @returns {boolean}
     */
    isNone() {
      return this.getEntryInfo().getGraphType() === types.GT_NONE;
    }

    /**
     * Is this entry of the EntryType link?
     * @returns {boolean}
     */
    isLink() {
      return this.getEntryInfo().getEntryType() === types.ET_LINK;
    }

    /**
     * Is this entry of the EntryType reference?
     * @returns {boolean}
     */
    isReference() {
      return this.getEntryInfo().getEntryType() === types.ET_REF;
    }

    /**
     * Is this entry of the EntryType linkreference?
     * @returns {boolean}
     */
    isLinkReference() {
      return this.getEntryInfo().getEntryType() === types.ET_LINKREF;
    }

    /**
     * Is the entry of the EntryType link, linkreference or reference?
     * That is, the resource can be controlled via {@link store/EntryInfo#setResourceURI}.
     *
     * @returns {boolean} true if entrytype is NOT local.
     */
    isExternal() {
      return this.getEntryInfo().getEntryType() !== types.ET_LOCAL;
    }

    /**
     * Is the EntryType local, i.e. the resources URI is maintained
     * automatically by the repository for this entry.
     * Opposite to {@link store/Entry#isLinkLike}.
     *
     * @returns {boolean}
     */
    isLocal() {
      return this.getEntryInfo().getEntryType() === types.ET_LOCAL;
    }

    /**
     * Is the entry a local link/linkreference/reference to another entry in the repository.
     * That is, true if the entry is a link, linkreference or reference AND the resource URI
     * belongs to another entry in the same repository.
     *
     * @returns {boolean}
     */
    isLinkToEntry() {
      const base = this.getEntryStore().getBaseURI();
      return this.isExternal() && this.getResourceURI().substr(0, base.length) === base;
    }

    /**
     * Is the entry is a link to another entry (as either a link, linkreference or reference) the
     * linked to entry is returned in a promise.
     *
     * @returns {entryPromise|undefined} undefined only if the entry does not link to another entry.
     */
    getLinkedEntry() {
      if (this.isLinkToEntry()) {
        // In case the link is to the resoure URI rather than the entry URI, we extract
        // the entry id and context id and rebuild the entry URI.
        const es = this.getEntryStore();
        let uri = this.getResourceURI();
        const eid = es.getEntryId(uri);
        const cid = es.getContextId(uri);
        uri = es.getEntryURI(cid, eid);
        return es.handleAsync(this.getEntryStore().getEntry(uri), 'getLinkedEntry');
      }
      return undefined;
    }

    /**
     * Is the entry an information resource?
     * @returns {boolean}
     */
    isInformationResource() {
      return this.getEntryInfo().getResourceType() === types.RT_INFORMATIONRESOURCE;
    }

    /**
     * Is the entry a named resource?
     * @returns {boolean}
     */
    isNamedResource() {
      return this.getEntryInfo().getResourceType() === types.RT_NAMEDRESOURCE;
    }

    /**
     * Is the current user an owner of this entry?
     * @returns {boolean}
     */
    canAdministerEntry() {
      return this._rights.administer || false;
    }

    /**
     * Is the current user authorized to read the resource of this entry?
     * @returns {boolean}
     */
    canReadResource() {
      return this._rights.administer || this._rights.readresource
        || this._rights.writeresource || false;
    }

    /**
     * Is the current user authorized to write the resource of this entry?
     * @returns {boolean}
     */
    canWriteResource() {
      return this._rights.administer || this._rights.writeresource || false;
    }

    /**
     * Is the current user authorized to read the metadata of this entry?
     * @returns {boolean}
     */
    canReadMetadata() {
      return this._rights.administer || this._rights.readmetadata
        || this._rights.writemetadata || false;
    }

    /**
     * Is the current user authorized to write the metadata of this entry?
     * @returns {boolean}
     */
    canWriteMetadata() {
      return this._rights.administer || this._rights.writemetadata || false;
    }

    /**
     * Whether this entry is available publically or not.
     * To make sure this method returns a boolean make sure the contexts entry is loaded, e.g. via:
     * entry.getContext().getEntry().then(function() {
     *    if (entry.isPublic()) {...} //Or whatever you need to do with the isPublic method.
     * }
     *
     * @returns {boolean|undefined} undefined only if the entry has no ACL and the contexts entry
     * which specifies the default access is not cached, otherwise a boolean is returned.
     */
    isPublic() {
      const guestprincipal = this.getEntryStore().getResourceURI('_principals', '_guest');
      let acl = this.getEntryInfo().getACL();
      if (acl.contextOverride) {
        return ['rwrite', 'rread', 'mwrite', 'mread'].some(key =>
          acl[key].indexOf(guestprincipal) !== -1);
      }
      const ce = this.getContext().getEntry(true);
      if (ce == null) {
        return undefined;
      }
      acl = ce.getEntryInfo().getACL();
      return ['rwrite', 'rread'].some(key => acl[key].indexOf(guestprincipal) !== -1);
    }

    /**
     * Whether this entry is available to the specified user.
     * To make sure this method returns a boolean and not undefined,
     * make sure that the contexts entry is loaded, e.g. via:
     *
     * entry.getContext().getEntry().then(function() {
     *    //And then do you check, e.g.:
     *    entry.getEntryStore().getUserEntry().then(function(currentUserEntry) {
     *       if (entry.isPrivateTo(currentUserEntry) {...}
     *    })
     * }
     *
     * @returns {boolean|undefined} undefined if the contexts entry which
     * specifies the default access is not cached, otherwise a boolean is returned.
     */
    isPrivateTo(userEntry) {
      const userPrincipal = userEntry.getResourceURI();
      const acl = this.getEntryInfo().getACL();
      const ce = this.getContext().getEntry(true);
      if (ce == null) {
        return undefined;
      }
      const cacl = ce.getEntryInfo().getACL();
      if (cacl.admin.length !== 1 || acl.admin[0] !== userPrincipal) {
        return false;
      }
      if (acl.contextOverride) {
        return acl.admin.length === 1 && acl.admin[0] === userPrincipal;
      }
      return true;
    }

    /**
     * Deletes this entry without any option to recover it.
     * @param {boolean} recursive if true and the entry is a list it will delete the entire tree of
     * lists and all entries that is only contained in the current list or any of its child lists.
     * @return {dojo/promise/Promise} which on success indicates that the deletion has succeded.
     */
    del(recursive) {
      const es = this.getEntryStore();
      const unCache = () => {
        es.getCache().unCache(this);
      };
      if (recursive === true) {
        return es.handleAsync(es.getREST().del(`${this.getURI()}?recursive=true`)
          .then(unCache), 'delEntry');
      }
      return es.handleAsync(es.getREST().del(this.getURI()).then(unCache), 'delEntry');
    }

    /**
     * That an entry needs to be refreshed typically means that it contains stale data
     * (with respect to what is available in the store).
     * The entry should be refresh before it is further used.
     *
     * @param {boolean=} silently the cache will send out a stale message (to all registered
     * listeners of the cache) for this entry if the value is false or undefined.
     * @see store.Entry#refresh.
     */
    setRefreshNeeded(silently) {
      this.getEntryStore().getCache().setRefreshNeeded(this, silently);
    }

    /**
     * Tells whether an entry needs to be refreshed.
     *
     * @return {boolean} true if the entry need to be refreshed before used.
     * @see store/Entry#refresh.
     */
    needRefresh() {
      return this.getEntryStore().getCache().needRefresh(this);
    }

    /**
     * Refreshes an entry if needed, that is, if it has been marked as invalid.
     * @param {boolean=} silently the cache will send out a refresh message for this entry
     * if a refresh was needed AND if the value of silently is false or undefined. If force is true
     * it will send out a refresh message anyhow.
     * @param {force=} if true the entry will be refreshed independent if it was marked in need
     * of a refresh or not.
     */
    refresh(silently, force) {
      const es = this.getEntryStore();
      let p;
      if (force === true || es.getCache().needRefresh(this)) {
        const entryURI = this.getURI();
        const factory = this.getEntryStore().getFactory();
        p = es.getREST().get(factory.getEntryLoadURI(entryURI)).then((data) => {
          factory.update(this, data);
          es.getCache().cache(this, silently);
          return this;
        });
      } else {
        p = Promise.resolve(this);
      }
      return es.handleAsync(p, 'refresh');
    }
  };

  export default Entry;

/**
 * Promise that provides an {@link store/Entry} on success.
 *
 * @name entryPromise
 * @extends dojo/promise/Promise
 * @class
 */
/**
 * @name entryPromise#then
 * @param {entryCallback} onSuccess
 * @param {xhrFailureCallback} onError
 */
/**
 * This is a successful callback method to be provided as first argument in a {@link entryPromise}
 *
 * @callback entryCallback
 * @param {store/Entry} entry
 */
