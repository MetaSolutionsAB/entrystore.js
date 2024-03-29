import { Graph } from '@entryscape/rdfjson';
import Context from './Context.js';
import Entry from './Entry.js';
import EntryInfo from './EntryInfo.js';
import FileResource from './File.js';
import GraphResource from './Graph.js';
import Group from './Group.js';
import List from './List.js';
import Pipeline from './Pipeline.js';
import SearchList from './SearchList.js';
import StringResource from './String.js';
import types from './types.js';
import User from './User.js';

/**
 * This module contains utility methods that encapsulates EntryStores REST layer from the rest
 * of the code. It is intended to be used internally by the EntryStore.js API,
 * not by application developers.
 *
 * Hence, **you should avoid using factory methods directly in application code as there are
 * most probably other ways to achieve the same thing. Most likely by using method in
 * {@link EntryStore}!**
 *
 * The utility methods are currently not visible as they are not documented yet.
 * (The methods cannot be marked as private as they need to be used throughout the API.)
 *
 * @exports store/factory
 * @namespace
 */

let sortObj = { sortBy: 'title', prio: 'List' };
let defaultLimit = 50;

/**
 *
 * @param entryURI
 * @param entryStore
 * @returns {*}
 */
const getContextForEntry = (entryURI, entryStore) => {
  const baseURI = entryStore.getBaseURI();
  const contextId = entryURI.substr(baseURI.length, entryURI.indexOf('/', baseURI.length)
    - baseURI.length);
  const contexts = entryStore.getCachedContextsIdx();
  let context = contexts[contextId];
  if (!context) {
    context = new Context(`${baseURI}_contexts/entry/${contextId}`, baseURI
      + contextId, entryStore);
    contexts[contextId] = context;
  }
  return context;
};

/**
 *
 * @param rights
 */
const transformRights = (rights) => {
  const o = {};
  const r = rights || [];
  for (let n = 0; n < r.length; n++) {
    o[r[n]] = true;
  }
  return o;
};

/**
 *
 * @param resObj
 * @param data
 */
const fixNameAndDisabled = (resObj, data) => {
  const { resource } = data;
  // Special case of searches and similar when name is provided but not full resource.
  if (resObj != null) {
    if (resource && typeof resource.name === 'string') {
      if (resObj instanceof User) {
        resObj._data = resObj._data || {};
        resObj._data.name = resource.name;
      } else { // Context and Group
        resObj._name = resource.name;
      }
    }
    if (resObj instanceof User) {
      resObj._data = resObj._data || {};
      if (resource && typeof resource.disabled === 'boolean') {
        resObj._data.disabled = resource.disabled;
      }
    }
  }
};

/**
 *
 * @param entry
 * @param data
 * @param force
 * @private
 */
const _updateOrCreateResource = (entry, data, force) => {
  const _data = data || {};
  let resource = entry.getResource(true);
  const uri = entry.getURI();
  const ruri = entry.getResourceURI();
  const cruri = entry.getContext().getResourceURI();
  const es = entry.getEntryStore();
  const ei = entry.getEntryInfo();
  if (!resource && ei.getEntryType() === types.ET_LOCAL
    && ei.getResourceType() === types.RT_INFORMATIONRESOURCE) {
    switch (entry.getEntryInfo().getGraphType()) {
      case types.GT_CONTEXT: // Synchronous resource, asynchronous methods.
        // Dummy URL to find the right context.
        resource = getContextForEntry(`${es.getBaseURI() + entry.getId()}/`,
          entry.getEntryStore());
        resource._update(_data);
        break;
      case types.GT_LIST: // Synchronous resource, asynchronous methods.
      case types.GT_GROUP: // Synchronous resource, asynchronous methods.
        if (entry.isGroup()) {
          resource = new Group(uri, ruri, es);
        } else {
          resource = new List(uri, ruri, es);
        }
        if (_data.resource && _data.resource.children) {
          resource._update(_data.resource, _data.resource.children.map(child =>
            updateOrCreate(`${cruri}/entry/${child.entryId}`, child, es)));
        }
        break;
      case types.GT_USER: // Asynchronous resource, synchronous getters.
        if (force || _data.resource != null) {
          resource = new User(uri, ruri, es, _data.resource || {});
        }
        break;
      case types.GT_STRING:
        if (force || _data.resource != null) {
          resource = new StringResource(uri, ruri, es, _data.resource || '');
        }
        break;
      case types.GT_GRAPH: // Sync or Async?
        if (force || _data.resource != null) {
          resource = new GraphResource(uri, ruri, es, _data.resource || {});
        }
        break;
      case types.GT_PIPELINE: // Sync or Async?
        if (force || _data.resource != null) {
          resource = new Pipeline(uri, ruri, es, _data.resource || {});
        }
        break;
      case types.GT_PIPELINERESULT: // If local, Pipelineresult resource is a file.
      case types.GT_NONE: // Uploaded file.
        resource = new FileResource(uri, ruri, es);
        break;
      default:
    }
    entry._resource = resource;
    fixNameAndDisabled(resource, _data);
    return;
  }

  if (resource == null || _data.resource == null) {
    fixNameAndDisabled(resource, _data);
    return;
  }

  if (resource._update) {
    if (entry.isList() || entry.isGroup()) {
      if (_data.resource && _data.resource.children) {
        resource._update(_data.resource, _data.resource.children.map(child =>
          updateOrCreate(`${cruri}/entry/${child.entryId}`,
            child, entry.getEntryStore())));
      }
    } else {
      resource._update(_data.resource);
    }
  }
};

/**
 *
 * @param entry
 * @param data
 * @returns {*}
 * @private
 */
const _updateEntry = (entry, data) => {
  entry._metadata = data.metadata ? new Graph(data.metadata) : null;
  entry._cachedExternalMetadata = data['cached-external-metadata'] ? new Graph(data['cached-external-metadata']) : null;
  entry._inferredMetadata = data.inferred ? new Graph(data.inferred) : null;
  entry._extractedMetadata = data['extracted-metadata'] ? new Graph(data['extracted-metadata']) : null;
  entry._relation = data.relations ? new Graph(data.relations) : new Graph();
  entry._rights = transformRights(data.rights);
  // Sometimes we get the name that is really part of the resource without getting the full
  // resource, in this case we store this in the entryinfo.
  if (data.name || data.alias || (data.resource && data.resource.name)) {
    const ei = entry.getEntryInfo();
    // ei._alias = data.alias;
    ei._name = data.name || data.alias || data.resource.name;
  }
  // Sometimes we get the disabled state that is really part of the resource
  // without getting the full resource, in this case we store this in the entryinfo.
  if (data.disabled || (data.resource && data.resource.disabled)) {
    const ei = entry.getEntryInfo();
    ei._disabled = data.disabled || data.resource.disabled;
  }
  return entry;
};

/**
 *
 * @param entryStore
 * @param contextEntryURI
 * @return {Context}
 */
const getContext = (entryStore, contextEntryURI) => {
  const baseURI = entryStore.getBaseURI();
  const contextsBaseURI = `${baseURI}_contexts/entry/`;
  const contextId = contextEntryURI.substr(contextsBaseURI.length);
  const contexts = entryStore.getCachedContextsIdx();
  let context = contexts[contextId];
  if (!context) {
    context = new Context(contextEntryURI, baseURI + contextId, entryStore);
    contexts[contextId] = context;
  }
  return context;
};

/**
 *
 * @param entryStore
 * @param entryURI
 * @return {List}
 */
const getList = (entryStore, entryURI) => {
  const cache = entryStore.getCache();
  let entry = cache.get(entryURI);
  if (!entry) {  // If no entry is in cache, create an empty entry
    // Assuming there is an info object... TODO check so not info_stub remains in rest layer.
    const entryInfo = new EntryInfo(entryURI, new Graph(), entryStore);
    const context = getContextForEntry(entryURI, entryStore);
    entry = new Entry(context, entryInfo);
    const resourceURI = entryURI.replace('/entry/', '/resource/');
    entry._resource = new List(entryURI, resourceURI, entryStore);
    cache.cache(entry, true); // Add to cache silently
    entry.setRefreshNeeded(true);  // Make sure it needs to be updated before accessed
  }
  // Returning only the list which has no reference to the entry isolates the entry from
  // being accessed before refreshed.
  return entry._resource;
};

/**
 *
 * @param entryURI
 * @param data
 * @param entryStore
 * @return {Entry}
 */
const updateOrCreate = (entryURI, data, entryStore) => {
  const cache = entryStore.getCache();
  let entry = cache.get(entryURI);
  if (entry) {
    entry.getEntryInfo().setGraph(new Graph(data.info));
  } else {
    // Assuming there is an info object... TODO check so not info_stub remains in rest layer.
    const entryInfo = new EntryInfo(entryURI, new Graph(data.info), entryStore);
    const context = getContextForEntry(entryURI, entryStore);
    entry = new Entry(context, entryInfo);
  }
  _updateEntry(entry, data);
  _updateOrCreateResource(entry, data);
  cache.cache(entry); // Add to or refresh the cache.
  return entry;
};

/**
 *
 * @type {_updateOrCreateResource}
 */
const updateOrCreateResource = _updateOrCreateResource;

/**
 *
 * @param {Entry} entry
 * @param {Object} data
 */
const update = (entry, data) => {
  entry.getEntryInfo().setGraph(new Graph(data.info));
  _updateOrCreateResource(entry, data);
  _updateEntry(entry, data);
  entry.getEntryStore().getCache().cache(entry); // Add to or refresh the cache.
};

/**
 *
 * @param entryStore
 * @param query
 * @return {SearchList}
 */
const createSearchList = (entryStore, query) => new SearchList(entryStore, query);

/**
 *
 * @param data
 * @param list
 * @param entryStore
 * @return {Array.<Entry>}
 */
const extractSearchResults = (data, list, entryStore) => {
  // Update or create all entries received
  // TODO change rest api so offset is inside of resource.
  data.resource.offset = data.resource.offset || data.offset;
  // TODO change rest api so size is inside of resource.
  data.resource.size = data.resource.size || data.results;
  const baseURI = entryStore.getBaseURI();
  const entries = data.resource.children.map(child => updateOrCreate(
    `${baseURI + child.contextId}/entry/${child.entryId}`, child, entryStore));
  list._update(data.resource, entries);
  return entries;
};

/**
 *
 * @param entryURI
 * @return {string}
 */
const getCachedExternalMetadataURI = entryURI => entryURI.replace('/entry/', '/cached-external-metadata/');

/**
 * @deprecated in favor of {@link factory#getEntryId}
 */
const getId = uri => uri.substr(uri.lastIndexOf('/') + 1);

/**
 *
 * @param uri
 * @param base
 * @return {string|undefined}
 */
const getEntryId = (uri, base) => {
  let _uri = uri;
  if (base) {
    _uri = _uri.substr(base.length - 1); // include the / before.
  }
  const res = _uri.match(/\/([^/]+)\/(entry|resource|metadata|relation)\/([^?/]+)(\?.*)?$/);
  if (res) {
    return res[3];
  } else if (_uri.lastIndexOf('/') === 0) {
    return _uri.substr(1);
  } else if (!base) {
    return _uri.substr(_uri.lastIndexOf('/') + 1);
  }
  return undefined;
};

/**
 *
 * @param uri
 * @param base
 * @return {string|undefined}
 */
const getContextId = (uri, base) => {
  let _uri = uri;
  if (base) {
    _uri = _uri.substr(base.length - 1); // include the / before.
  }
  const res = _uri.match(/\/([^/]+)\/(entry|resource|metadata|relation)\/([^?/]+)(\?.*)?$/);
  if (res) {
    return res[1];
  } else if (_uri.indexOf('/') === -1 || !base) {
    return '_contexts';
  }
  return undefined;
};

/**
 *
 * @param entryStore
 * @param uri
 * @return {string}
 */
const getEntryURIFromURI = (entryStore, uri) => {
  const base = entryStore.getBaseURI();
  return `${base + getContextId(uri, base)}/entry/${getEntryId(uri, base)}`;
};

/**
 *
 * @param entryStore
 * @param contextId
 * @param entryId
 * @return {string}
 */
const getEntryURI = (entryStore, contextId, entryId) => `${entryStore.getBaseURI()}${contextId}/entry/${entryId}`;

/**
 *
 * @param entryStore
 * @param uri
 * @return {string}
 */
const getMetadataURIFromURI = (entryStore, uri) => {
  const base = entryStore.getBaseURI();
  return `${base + getContextId(uri, base)}/metadata/${getEntryId(uri, base)}`;
};

/**
 *
 * @param entryStore
 * @param contextId
 * @param entryId
 * @return {string}
 */
const getMetadataURI = (entryStore, contextId, entryId) =>
  `${entryStore.getBaseURI()}${contextId}/entry/${entryId}`;

/**
 *
 * @param entryStore
 * @param contextId
 * @return {string}
 */
const getResourceBase = (entryStore, contextId) =>
  `${entryStore.getBaseURI() + contextId}/resource/`;

/**
 *
 * @param entryStore
 * @param contextId
 * @param entryId
 * @return {string}
 */
const getResourceURI = (entryStore, contextId, entryId) => {
  if (contextId === '_contexts') {
    return entryStore.getBaseURI() + entryId;
  }
  return `${entryStore.getBaseURI() + contextId}/resource/${entryId}`;
};

/**
 *
 * @param data
 * @param context
 * @return {string}
 */
const getURIFromCreated = (data, context) =>
  `${context.getResourceURI()}/entry/${data.entryId}`;

/**
 *
 * @param entryURI
 * @param params
 * @return {string}
 */
const getEntryLoadURI = (entryURI, params) => {
  const _params = params || {};
  let strL = '';
  if (_params.limit > 0 || _params.limit === -1) {
    strL = `&limit=${_params.limit}`;
  } else {
    strL = `&limit=${defaultLimit}`;
  }
  const strO = _params.offset == null || _params.offset === 0 ? '' : `&offset=${_params.offset}`;
  const sort = _params.sort == null ? sortObj : _params.sort;
  let strSort = '';
  let strDesc = '';
  let strPrio = '';
  if (sort != null) {
    strSort = sort.sortBy == null ? '' : `&sort=${sort.sortBy}`;
    strDesc = sort.descending === true ? '&order=desc' : '';
    strPrio = sort.prio == null ? '' : `&prio=${sort.prio}`;
    // TODO lang remains.
  }
  return `${entryURI}?includeAll${strL}${strO}${strSort}${strDesc}${strPrio}`;
};

/**
 *
 * @param prototypeEntry
 * @param parentListEntry
 * @return {string}
 */
const getEntryCreateURI = (prototypeEntry, parentListEntry) => {
  let uri = `${prototypeEntry.getContext().getResourceURI()}?`;
  if (prototypeEntry) {
    const ei = prototypeEntry.getEntryInfo();
    if (prototypeEntry.getSpecificId() != null) {
      uri = `${uri}id=${prototypeEntry.getSpecificId()}&`;
    }
    if (prototypeEntry.isLink()) {
      uri = `${uri}resource=${encodeURIComponent(prototypeEntry.getResourceURI())}&`;
    }
    if (prototypeEntry.isReference() || prototypeEntry.isLinkReference()) { // external metadata
      uri = `${uri}resource=${encodeURIComponent(prototypeEntry.getResourceURI())}&`;
      uri = `${uri}cached-external-metadata=${encodeURIComponent(ei.getExternalMetadataURI())}&`;
    }
    if (ei.getEntryType() !== types.ET_LOCAL) { // local, link, linkreference, reference
      uri = `${uri}entrytype=${ei.getEntryType().toLowerCase()}&`;
    }
    // informationresource, namedresource
    if (ei.getResourceType() !== types.RT_INFORMATIONRESOURCE) {
      // TODO Bug in REST layer, should be resourcetype, is now informationresource innstead
      uri = `${uri}informationresource=false&`;
    }
    if (ei.getGraphType() !== types.GT_NONE) {
      uri = `${uri}graphtype=${ei.getGraphType().toLowerCase()}&`;
    }
  }
  if (parentListEntry) {
    uri = `${uri}list=${parentListEntry.getResourceURI()}&`;
  }

  return uri.slice(0, -1);
};

/**
 *
 * @param prototypeEntry
 * @return {string}
 */
const getEntryCreatePostData = (prototypeEntry) => {
  const postData = {};
  let empty = true;
  const md = prototypeEntry.getMetadata();
  if (md != null && !md.isEmpty()) {
    postData.metadata = md.exportRDFJSON();
    empty = false;
  }
  const re = prototypeEntry.getResource(true);
  if (re != null && re.getSource != null) {
    postData.resource = re.getSource();
    empty = false;
  }
  const ei = prototypeEntry.getEntryInfo().getGraph();
  if (ei != null && !ei.isEmpty()) {
    postData.info = ei.exportRDFJSON();
    empty = false;
  }
  const cachedExternalMetadata = prototypeEntry.getCachedExternalMetadata();
  if (cachedExternalMetadata != null && !cachedExternalMetadata.isEmpty()) {
    postData['cached-external-metadata'] = cachedExternalMetadata.exportRDFJSON();
    empty = false;
  }
  return empty ? '' : JSON.stringify(postData);
};

/**
 *
 * @param entry
 * @param fromListEntry
 * @param toListEntry
 * @param baseURI
 * @return {string}
 */
const getMoveURI = (entry, fromListEntry, toListEntry, baseURI) => {
  const entryURI = entry.getURI().substr(baseURI.length); // Only send something like 3/entry/2
  const furi = fromListEntry.getResourceURI().substr(baseURI.length);
  return `${toListEntry.getResourceURI()}?moveEntry=${entryURI}&fromList=${furi}`;
};

/**
 *
 * @param baseURI
 * @param uri
 * @param formatHint
 * @return {string}
 */
const getProxyURI = (baseURI, uri, formatHint) => {
  let url = `${baseURI}proxy?url=${encodeURIComponent(uri)}`;
  if (formatHint != null) {
    url += `&fromFormat=${formatHint}`;
  }
  return url;
};

/**
 *
 * @param uri
 * @return {string}
 */
const getPutFileURI = uri =>
  `${uri + (uri.indexOf('?') < 0 ? '?' : '&')}method=put&textarea=true`;

/**
 * @param sortObject
 */
const setSort = (sortObject) => {
  sortObj = sortObject;
};

/**
 * @return {{sortBy: string, prio: string}}
 */
const getSort = () => sortObj;

/**
 *
 * @return {number}
 */
const getDefaultLimit = () => defaultLimit;

/**
 *
 * @param limit
 */
const setDefaultLimit = (limit) => {
  defaultLimit = limit;
};

export default {
  getContext,
  getList,
  updateOrCreate,
  updateOrCreateResource,
  update,
  createSearchList,
  extractSearchResults,
  getCachedExternalMetadataURI,
  getId,
  getEntryId,
  getContextId,
  getEntryURIFromURI,
  getEntryURI,
  getMetadataURIFromURI,
  getMetadataURI,
  getResourceBase,
  getResourceURI,
  getURIFromCreated,
  getEntryLoadURI,
  getEntryCreateURI,
  getEntryCreatePostData,
  getMoveURI,
  getProxyURI,
  getPutFileURI,
  setSort,
  getSort,
  getDefaultLimit,
  setDefaultLimit,
};
