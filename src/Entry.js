import { Graph } from '@entryscape/rdfjson';
import factory from './factory.js';
import types from './types.js';

/**
 * Entries are at the center of this API. Entries holds together metadata, external metadata,
 * resources, access control, and provenance. Hence, entries appear in the majority of methods,
 * either directly or in callbacks via promises. Each entry has a simple identifier within a
 * context and a globally unique URI that can be used to load, store and index the entry.
 *
 * Many of the methods in this class are convenience methods that allows the developer to interact
 * with the information retrieved from the repository without digging through the RDF graphs.
 * For instance, all methods starting with _can_ or _is_ are convenience methods for working
 * with access control or the type information available in the associated
 * The same is true for the majority of the get methods,
 * only those that have corresponding set methods are really unique for this class.
 *
 * @link EntryInfo
 * @exports store/Entry
 */
export default class Entry {
  /**
   * @param {Context} context container for this entry
   * @param {EntryInfo} entryInfo defines the basics of this entry
   */
  constructor(context, entryInfo) {
    this._context = context;
    this._entryInfo = entryInfo;
    this._entryInfo._entry = this;
  }

  /**
   * @returns {EntryStore}
   */
  getEntryStore() {
    return this._context.getEntryStore();
  }

  /**
   * @returns {EntryInfo}
   */
  getEntryInfo() {
    return this._entryInfo;
  }

  /**
   * Convenience method, same as calling entry.getEntryInfo().getEntryURI()
   * @return {string} the entry uri.
   * @see EntryInfo#getEntryURI
   */
  getURI() {
    return this._entryInfo.getEntryURI();
  }

  /**
   * Convenience method, same as calling entry.getEntryInfo().getId()
   * @returns {string} the id of the entry
   * @see EntryInfo#getId
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
   * @returns {Context}
   */
  getContext() {
    return this._context;
  }

  /**
   * Provides all metadata, different behaviour depending on entry type:
   * * local - local metadata, i.e. getMetadata()
   * * link - local metadata, i.e. getMetadata()
   * * reference - cached external metadata, i.e. getCachedExternalMetadata()
   * * linkReference - new graph which is a combination of cached external metadata and local metadata
   *
   * @return {rdfjson/Graph}
   */
  getAllMetadata() {
    if (this.isReference()) {
      return this.getCachedExternalMetadata();
    } else if (this.isLinkReference()) {
      const graph = new Graph();
      graph.addAll(this.getMetadata());
      graph.addAll(this.getCachedExternalMetadata(), 'external');
      return graph;
    }
    return this.getMetadata();
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
   * @return Entry - to allow chaining with other methods, e.g. with commitMetadata.
   */
  setMetadata(graph) {
    this._metadata = graph;
    return this;
  }

  /**
   * Will push the metadata for this entry to the repository.
   * If metadata has been set for an entry with EntryType 'reference'
   * the entry type will change to 'linkreference' upon a successful commit.
   * @params {boolean} [ignoreIfUnmodifiedSinceCheck=false] if explicitly set to true no check is done
   * if information is stale, also it will not automatically refresh with the latest date
   * @return {Promise.<Entry>} a promise that on success will contain the current updated entry.
   */
  async commitMetadata(ignoreIfUnmodifiedSinceCheck = false) {
    const es = this.getEntryStore();
    if (this.isReference()) {
      return Promise.reject(`Entry "${this.getURI()}" is a reference and have no local metadata that can be saved.`);
    } else if (!this.canWriteMetadata()) {
      return Promise.reject(`You do not have sufficient access rights to save metadata on entry "${this.getURI()}".`);
    } else if (this.needRefresh()) {
      return Promise.reject(`The entry "${this.getURI()}" need to be refreshed before its local metadata can be saved.\n` +
        'This message indicates that the client is written poorly, this case should have been taken into account.');
    } else if (this._metadata == null) {
      return Promise.reject(`The entry "${this.getURI()}" should allow local metadata to be saved, but there is no local metadata.\nThis message is a bug in the storejs API.`);
    } else {
      const promise = es.getREST().put(this.getEntryInfo().getMetadataURI(), JSON.stringify(this._metadata.exportRDFJSON()),
        ignoreIfUnmodifiedSinceCheck ? undefined : this.getEntryInfo().getModificationDate());
      es.handleAsync(promise, 'commitMetadata');
      const response = await promise;
      this.getEntryInfo().setModificationDate(response.header['last-modified']);
    }

    return Promise.resolve(this);
  }

  /**
   * Same as entry.getMetadata().add(entry.getResourceURI(), predicate, o)
   * but instead of returning the created statement it returns the entry itself,
   * allowing chained method calls.
   *
   * @param {string} predicate the predicate
   * @param {object} object the object
   * @returns {Entry}
   */
  add(predicate, object) {
    this.getMetadata().add(this.getResourceURI(), predicate, object);
    return this;
  }

  /**
   * Same as entry.getMetadata().addL(entry.getResourceURI(), predicate, literal, lang)
   * but instead of returning the created statement it returns the entry itself,
   * allowing chained method calls.
   *
   * @param {string} predicate the predicate
   * @param {string} literal the literal value
   * @param {string} language an optional language
   * @returns {Entry}
   */
  addL(predicate, literal, language) {
    this.getMetadata().addL(this.getResourceURI(), predicate, literal, language);
    return this;
  }

  /**
   * Same as entry.getMetadata().addD(entry.getResourceURI(), predicate, literal, lang)
   * but instead of returning the created statement it returns the entry itself,
   * allowing chained method calls.
   *
   * @param {string} predicate the predicate
   * @param {string} literal the literal value
   * @param {string} datatype the datatype (should be a string)
   * @returns {Entry}
   */
  addD(predicate, literal, datatype) {
    this.getMetadata().addD(this.getResourceURI(), predicate, literal, datatype);
    return this;
  }

  /**
   * Cached external metadata can only be provided for entries with entry type
   * reference or link reference.
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
   * @return Entry - to allow chaining with other methods,
   * e.g. with commitCachedExternalMetadata.
   */
  setCachedExternalMetadata(graph) {
    if (graph) {
      this._cachedExternalMetadata = graph;
    }

    return this;
  }

  /**
   * Pushes the current cached external metadata graph for this entry to the repository.
   *
   * @return {Promise.<Entry>} a promise that on success will contain the current updated entry.
   */
  async commitCachedExternalMetadata(ignoreIfUnmodifiedSinceCheck) {
    const es = this.getEntryStore();
    const promise = es.getREST().put(this.getEntryInfo().getCachedExternalMetadataURI(),
      JSON.stringify(this._cachedExternalMetadata.exportRDFJSON()),
      ignoreIfUnmodifiedSinceCheck ? undefined : this.getEntryInfo().getModificationDate());
    es.handleAsync(promise, 'commitCachedExternalMetadata');
    const response = await promise;
    this.getEntryInfo().setModificationDate(response.header['last-modified']);
    return Promise.resolve(this);
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
   * @returns {Resource | Promise.<Resource>}
   */
  getResource(direct = false) {
    if (direct) {
      return this._resource;
    }
    const es = this.getEntryStore();
    let promise;
    if (this._resource) {
      promise = Promise.resolve(this._resource);
    } else {
      const format = this.isString() ? 'text' : null;
      promise = es.getREST().get(this.getResourceURI(), format).then((data) => {
        factory.updateOrCreateResource(this, { resource: data }, true);
        return this._resource;
      });
    }
    return es.handleAsync(promise, 'getResource');
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
      factory.getEntryURIFromURI(this.getEntryStore(), resURI), this);
  }

  /**
   * a list of entry URIs corresponding to groups where this user entry is member.
   * @returns {string[]}
   */
  getParentGroups() {
    const groupResourceURIArr = this.getReferrers('http://entrystore.org/terms/hasGroupMember');
    return groupResourceURIArr.map(resURI =>
      factory.getEntryURIFromURI(this.getEntryStore(), resURI), this);
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
   * That is, the resource can be controlled via {@link EntryInfo#setResourceURI}.
   *
   * @returns {boolean} true if entrytype is NOT local.
   */
  isExternal() {
    return this.getEntryInfo().getEntryType() !== types.ET_LOCAL;
  }

  /**
   * Is the EntryType local, i.e. the resources URI is maintained
   * automatically by the repository for this entry.
   * Opposite to {@link Entry#isLinkLike}.
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
   * @returns {Promise.<Entry>|undefined} undefined only if the entry does not link to another entry.
   */
  getLinkedEntry() {
    if (this.isLinkToEntry()) {
      // In case the link is to the resource URI rather than the entry URI, we extract
      // the entry id and context id and rebuild the entry URI.
      const es = this.getEntryStore();
      const resourceURI = this.getResourceURI();
      const entryId = es.getEntryId(resourceURI);
      const contextId = es.getContextId(resourceURI);
      const entryURI = es.getEntryURI(contextId, entryId);
      return es.handleAsync(this.getEntryStore().getEntry(entryURI), 'getLinkedEntry');
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
    const guestPrincipal = this.getEntryStore().getResourceURI('_principals', '_guest');
    let acl = this.getEntryInfo().getACL();
    if (acl.contextOverride) {
      return ['rwrite', 'rread', 'mwrite', 'mread'].some(key => acl[key].indexOf(guestPrincipal) !== -1);
    }
    const ce = this.getContext().getEntry(true);
    if (ce == null) {
      return undefined;
    }
    acl = ce.getEntryInfo().getACL();
    return ['rwrite', 'rread'].some(key => acl[key].indexOf(guestPrincipal) !== -1);
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
   * @return {Promise} which on success indicates that the deletion has succeeded.
   */
  async del(recursive = false) {
    const es = this.getEntryStore();
    const uri = `${this.getURI()}${recursive ? '?recursive=true' : ''}`;
    await es.handleAsync(es.getREST().del(uri), 'delEntry');
    es.getCache().unCache(this);
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
  setRefreshNeeded(silently = true) {
    this.getEntryStore().getCache().setRefreshNeeded(this, silently);
  }

  /**
   * Tells whether an entry needs to be refreshed.
   *
   * @return {boolean} true if the entry need to be refreshed before used.
   * @see Entry#refresh.
   */
  needRefresh() {
    return this.getEntryStore().getCache().needRefresh(this);
  }

  /**
   * Refreshes an entry if needed, that is, if it has been marked as invalid.
   * @param {boolean=} silently the cache will send out a refresh message for this entry
   * if a refresh was needed AND if the value of silently is false or undefined. If force is true
   * it will send out a refresh message anyhow.
   * @param {boolean=} [force=false] If true the entry will be refreshed independent if it was marked in need
   * of a refresh or not.
   */
  refresh(silently = true, force = false) {
    const es = this.getEntryStore();
    let p;
    if (force === true || es.getCache().needRefresh(this)) {
      const entryURI = this.getURI();
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
  /**
   *
   * Retrieves a projection, a plain object with simple attribute value pairs given mapping.
   * The subject will always be the resource uri of the entry.
   * The mapping is an object where the same attributes appear but with the predicates are values.
   * Hence, each attribute gives rise to a search for all statements with the given subject and
   * the predicate specified by the attribute.
   * The result object will contain the mapping attributes with values from the the first
   * matched statements object value if there are any.
   * To access additional information like multiple statement or the statements
   * (type, language, datatype) a "*" prepended version of each attribute can be provided that
   * contains a list of matching Statements if so indicated by the multipleValueStyle parameter.
   *
   * @param {Object} mappings the mapping configuration
   * @param {String} multipleValueStyle if provided an array is provided for that property
   * prefixed with "*", the array should be indicated to be either
   * "statements", "values" or "objects".
   * @returns {Object}
   * @see rdfjson/Graph
   * @example
   * var proj = entry.projection({
   *     "title":       "http://purl.org/dc/terms/title",
   *     "description": "http://purl.org/dc/terms/description"
   * });
   * // The object proj now has the attributes title, *title, description, and *description.
   *
   * // Accessing the title of http://example.com
   * console.log(proj.title);
   *
   * // To get hold of additional information available in the statement,
   * // for instance the language of a literal:
   * console.log(proj["*title"][0].getLanguage())
   *
   */
  projection(mappings = {}, multipleValueStyle = 'none') {
    return this._metadata.projection(this.getResourceURI(), mappings, multipleValueStyle);
  }
};
