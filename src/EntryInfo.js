import moment from 'moment';
import { Graph } from 'rdfjson';
import factory from './factory';
import terms from './terms';

const getResourceTypeHelper = (entry, vocab) => {
  const stmts = entry._graph.find(entry.getResourceURI(), terms.rdf.type);
  for (let i = 0; i < stmts.length; i++) {
    const t = vocab[stmts[i].getValue()];
    if (t != null) {
      return t;
    }
  }

  return vocab.default;
}

/**
 * EntryInfo is a class that contains all the administrative information of an entry.
 * @exports store/EntryInfo
 */
export default class EntryInfo {
  /**
   * @param {String} entryURI must be provided unless the graph contains a statement with
   * the store:resource property which allows us to infer the entryURI.
   * @param {rdfjson/Graph} graph corresponds to a rdfjson.Graph class with the entryinfo as
   * statements
   * @param {store/EntryStore} entryStore
   */
  constructor(entryURI, graph, entryStore) {
    this._entryURI = entryURI || graph.find(null, terms.resource)[0].getSubject();
    this._graph = graph || new Graph();
    this._entryStore = entryStore;
  }

  /**
   * @returns {store/Entry}
   */
  getEntry() {
    return this._entry;
  }

  /**
   * @param {rdfjson/Graph} graph
   */
  setGraph(graph) {
    this._graph = graph;
  }

  /**
   * @return {rdfjson/Graph}
   */
  getGraph() {
    return this._graph;
  }

  /**
   * Pushes the entry information to the repository, e.g. posts to
   * basepath/store/{contextId}/entry/{entryId}
   * @params {boolean} ignoreIfUnmodifiedSinceCheck if explicitly set to true no check is done
   * if information is stale, also it will not automatically refresh with the latest date
   * @returns {Promise.<store/EntryInfo>}
   */
  commit(ignoreIfUnmodifiedSinceCheck = false) {
    const es = this._entry.getEntryStore();
    let mod;
    if (ignoreIfUnmodifiedSinceCheck === true) {
      mod = this.getModificationDate();
    }
    const p = es.getREST().put(this.getEntryURI(),
      JSON.stringify(this._graph.exportRDFJSON()), mod)
      .then(() => {
        if (ignoreIfUnmodifiedSinceCheck !== true) {
          this._entry.setRefreshNeeded(true);
          return this._entry.refresh().then(() => this, () => {
            // Failed refreshing, but succeeded at saving metadata,
            // at least send out message that it needs to be refreshed.
            es.getCache().message('refreshed', this);
            return this;
          });
        }
        return this;
      });

    return es.handleAsync(p, 'commitEntryInfo');
  }

  /**
   * @returns {String}
   */
  getEntryURI() {
    return this._entryURI;
  }

  /**
   * @returns {String} the id of the entry
   */
  getId() {
    return factory.getEntryId(this._entryURI);
  }

  /**
   * If the entry is a user, group or context there can be a name.
   * In general the name is accessed on the resource, but in certain
   * situations we do not have the resource yet(not loaded) but we still
   * have the name (from a search where the name is provided but not the resource),
   * in this case we can access this name here.
   *
   * @returns {String} a username, groupname or contextname of the entry
   */
  getName() {
    return this._name;
  }

  /**
   * If the entry is a user there can be a disabled state.
   * In general the disabled state is accessed on the resource, but in certain
   * situations we do not have the resource yet(not loaded) but we still
   * have the disabled state (from a search where the disabled state is provided
   * but not the resource), in this case we can access the disabled state here.
   *
   * @returns {boolean} a disabled state of a user
   */
  isDisabled() {
    return this._disabled;
  }

  /**
   * @returns {String}
   */
  getMetadataURI() {
    return factory.getMetadataURIFromURI(this._entryStore, this._entryURI);
  }

  /**
   * @returns {String}
   */
  getExternalMetadataURI() {
    // TODO will only exist for LinkReferences and References.
    return this._graph.findFirstValue(this._entryURI, terms.externalMetadata);
  }

  /**
   * @param {String} uri
   */
  setExternalMetadataURI(uri) {
    this._graph.findAndRemove(this._entryURI, terms.externalMetadata);
    this._graph.create(this._entryURI, terms.externalMetadata, { type: 'uri', value: uri });
  }

  /**
   * @returns {String}
   */
  getCachedExternalMetadataURI() {
    return factory.getCachedExternalMetadataURI(this._entryURI);
  }

  /**
   * @returns {String}
   */
  getResourceURI() {
    return this._graph.findFirstValue(this._entryURI, terms.resource);
  }

  /**
   * @param {String} uri
   */
  setResourceURI(uri) {
    const oldResourceURI = this.getResourceURI();
    this._graph.findAndRemove(this._entryURI, terms.resource);
    this._graph.create(this._entryURI, terms.resource, { type: 'uri', value: uri });
    if (oldResourceURI) {
      const stmts = this._graph.find(oldResourceURI);
      for (let i = 0; i < stmts.length; i++) {
        stmts[i].setSubject(uri);
      }
    }
  }

  /**
   * @returns {String} one of the entryTypes
   * @see store/terms#entryType
   */
  getEntryType() {
    const et = this._graph.findFirstValue(this._entryURI, terms.rdf.type);
    return terms.entryType[et || 'default'];
  }


  /**
   * the resource type of the entry, e.g. "Information", "Resolvable" etc.
   * The allowed values are available in store/types beginning with 'RT_'.
   * E.g. to check if the entry is an information resource:
   * if (ei.getResourceType() === types.RT_INFORMATIONRESOURCE) {...}
   *
   * @returns {String}
   */
  getResourceType() {
    return getResourceTypeHelper(this, terms.resourceType);
  }

  /**
   * the graph type of the entry, e.g. "User", "List", "String", etc.
   * The allowed values are available in store/types beginning with 'GT_'.
   * E.g. to check if the entry is a list:
   * if (ei.getGraphType() === types.GT_LIST) {...}
   *
   * @returns {String}
   */
  getGraphType() {
    return getResourceTypeHelper(this, terms.graphType);
  }

  // TODO: change to entryURI instead of resourceURI for principalURIs.
  /**
   * The acl object returned looks like:
   * {
   *   admin:  [principalURI1, principalURI2, ...],
   *   rread:  [principalURI3, ...],
   *   rwrite: [principalURI4, ...],
   *   mread:  [principalURI5, ...],
   *   mwrite: [principalURI6, ...]
   * }
   *
   * There will always be an array for each key, it might be empty though.
   * The principalURI* will always be an URI to the resource of a user or group entry.
   *
   * Please note that a non empty acl overrides any defaults from the surrounding context.
   *
   * @param {boolean} asIds - if true the principalURIs are shortened to entry identifiers.
   * @return {Object} an acl object.
   */
  getACL(asIds = false) {
    const f = (stmt) => {
      if (asIds) {
        return factory.getEntryId(stmt.getValue());
      }
      return stmt.getValue();
    };  // Statement > object value.
    const ru = this.getResourceURI();
    const mu = this.getMetadataURI();
    const acl = {
      admin: this._graph.find(this._entryURI, terms.acl.write).map(f),
      rread: this._graph.find(ru, terms.acl.read).map(f),
      rwrite: this._graph.find(ru, terms.acl.write).map(f),
      mread: this._graph.find(mu, terms.acl.read).map(f),
      mwrite: this._graph.find(mu, terms.acl.write).map(f),
    };
    acl.contextOverride = acl.admin.length !== 0 || acl.rread.length !== 0
      || acl.rwrite.length !== 0 || acl.mread.length !== 0 || acl.mwrite.length !== 0;
    return acl;
  }

  /**
   * if the entry has an explicit ACL or if the containing contexts ACL is used.
   *
   * @returns {boolean}
   */
  hasACL() {
    return this.getACL().contextOverride;
  }

  /**
   * Replaces the current acl with the provided acl.
   * The acl object is the same as you get from the getACL call.
   * The first difference is that the acl object from this method is allowed to be empty
   * or leave out some keys that are not to be set.
   * The second difference is that it allows entryIds as values in the arrays,
   * not only full resource URIs, both have to refer to principals though.
   *
   * @param {Object} acl same kind of object you get from getACL.
   */
  setACL(acl) {
    const g = this._graph;
    const f = (subj, pred, principals, base) => {
      g.findAndRemove(subj, pred);
      (principals || []).forEach((principal) => {
        if (principal.length < base.length || principal.indexOf(base) !== 0) {
          // principal is entry id.
          g.add(subj, pred, { type: 'uri', value: base + principal });
        } else {
          // principal is a full entry resource uri.
          g.add(subj, pred, { type: 'uri', value: principal });
        }
      });
    };
    const _acl = acl || {};
    const ru = this.getResourceURI();
    const mu = this.getMetadataURI();
    const base = factory.getResourceBase(this._entry.getEntryStore(), '_principals');
    f(this._entryURI, terms.acl.write, _acl.admin, base);
    f(ru, terms.acl.read, _acl.rread, base);
    f(ru, terms.acl.write, _acl.rwrite, base);
    f(mu, terms.acl.read, _acl.mread, base);
    f(mu, terms.acl.write, _acl.mwrite, base);
  }

  /**
   * Checks if there are any metadata revisions for this entry,
   * in practise this is always true if provenance is enabled for this entry.
   *
   * @return {boolean} true if there is at least one metadata revision.
   */
  hasMetadataRevisions() {
    // const mdURI = this.getMetadataURI();
    return this._graph.findFirstValue(null, 'owl:sameAs') != null;
  }

  /**
   * Extracts an array of metadata revisions from the graph.
   * Each revision is an object that contains:
   *   * time - when the change was made (Date)
   *   * by   - the user who performed the change (entryURI)
   *   * rev  - the revision number (string)
   *   * uri  - an URI to this revision (string)
   *
   * The uri of the revision can be used by the method getMetadataRevisionGraph
   * to get a hold of the actual new graph that caused the revision.
   *
   * @return {{time: Date, by: string, rev: string, uri: string}[]} a sorted array of revisions, latest revision first.
   */
  getMetadataRevisions() {
    const revs = [];
    const mdURI = this.getMetadataURI();
    const stmts = this._graph.find(null, 'owl:sameAs', mdURI);

    if (stmts.length !== 1) {
      return revs;
    }
    let uri = stmts[0].getSubject();
    const es = this._entryStore;
    while (uri) {
      revs.push({
        uri,
        rev: uri.substr(mdURI.length + 5),
        time: moment(this._graph.findFirstValue(uri, 'prov:generatedAtTime')).toDate(),
        by: es.getEntryURIFromURI(this._graph.findFirstValue(uri, 'prov:wasAttributedTo')),
      });
      uri = this._graph.findFirstValue(uri, 'prov:wasRevisionOf');
    }
    revs.sort((r1, r2) => {
      if (r1.time > r2.time) {
        return -1;
      } else if (r1.time < r2.time) {
        return 1;
      }
      return 0;
    });
    return revs;
  }

  /**
   * Retrieves the metadata graph of a certain revision from its graph.
   * @param revisionURI
   * @return {Promise.<rdfjson/Graph>}
   */
  async getMetadataRevisionGraph(revisionURI) {
    const data = this._entryStore.getREST().get(revisionURI);
    return new Graph(data);
  }

  /**
   * @returns {string} the label of the resource of this entry,
   * typically set when uploading a file.
   */
  getLabel() {
    return this._graph.findFirstValue(this.getResourceURI(), 'http://www.w3.org/2000/01/rdf-schema#label');
  }

  /**
   * Sets a new label of the resource in the graph, call
   * {@link store/EntryInfo#commit commit} to push
   * the updated graph to the repository.
   *
   * @param {string} label - a new label for the resource.
   */
  setLabel(label) {
    this._graph.findAndRemove(this.getResourceURI(), 'http://www.w3.org/2000/01/rdf-schema#label');
    if (label != null && label !== '') {
      this._graph.add(this.getResourceURI(), 'http://www.w3.org/2000/01/rdf-schema#label', {
        type: 'literal',
        value: label,
      });
    }
  }

  /**
   * @returns {string} the format of the resource of this entry.
   */
  getFormat() {
    return this._graph.findFirstValue(this.getResourceURI(), 'http://purl.org/dc/terms/format');
  }

  /**
   * Sets a new format of the resource in the graph, call {@link store/EntryInfo#commit commit}
   * to push the updated graph to the repository.
   *
   * @param {string} format - a format in the form application/json or text/plain.
   */
  setFormat(format) {
    this._graph.findAndRemove(this.getResourceURI(), 'http://purl.org/dc/terms/format');
    if (format != null && format !== '') {
      this._graph.addL(this.getResourceURI(), 'http://purl.org/dc/terms/format', format);
    }
  }

  /**
   * @returns {string} the status of this entry, always a URI.
   */
  getStatus() {
    return this._graph.findFirstValue(this.getEntryURI(), terms.status.property);
  }

  /**
   * Sets a new status for this entry
   *
   * @param {string} status
   */
  setStatus(status) {
    this._graph.findAndRemove(this.getEntryURI(), terms.status.property);
    if (status != null && status !== '' && status.indexOf('http') === 0) {
      this._graph.add(this.getEntryURI(), terms.status.property, status);
    }
  }

  /**
   * @returns {Date} the date when the entry was created.
   */
  getCreationDate() {
    const d = this._graph.findFirstValue(this.getEntryURI(), 'http://purl.org/dc/terms/created');
    return moment(d).toDate(); // Must always exist.
  }

  /**
   * @returns {Date} the date of last modification (according to the repository,
   * local changes are not reflected).
   */
  getModificationDate() {
    const d = this._graph.findFirstValue(this.getEntryURI(), 'http://purl.org/dc/terms/modified');
    if (d != null) {
      return moment(d).toDate();
    }
    return this.getCreationDate();
  }

  /**
   * @returns {String} a URI to creator, the user Entry resource URI is used, e.g. "http://somerepo/store/_principals/resource/4", never null.
   */
  getCreator() {
    return this._graph.findFirstValue(this.getEntryURI(), 'http://purl.org/dc/terms/creator');
  }

  /**
   * @returns {number|undefined}
   */
  getSize() {
    const extent = this._graph.findFirstValue(this.getResourceURI(), 'http://purl.org/dc/terms/extent');
    if (parseInt(extent, 10) === parseInt(extent, 10)) {
      return parseInt(extent, 10);
    }
    return undefined;
  }

  /**
   * @returns {Array} an array of URIs to the contributors using their Entry resource URIs,
   * e.g. ["http://somerepo/store/_principals/resource/4"], never null although the array might be empty.
   */
  getContributors() {
    return this._graph.find(this.getEntryURI(), 'http://purl.org/dc/terms/contributor').map(stmt => stmt.getValue());
  }
};
