/*global define*/
define([
    'store/StringResource',
    'store/types',
    "dojo/json",
	"dojo/_base/array",
	"store/Context",
	"store/EntryInfo",
	"store/Entry",
    "store/List",
    "store/Group",
	"store/SearchList",
	"store/RDFGraph",
	"rdfjson/Graph",
    "store/User",
	"exports"
], function(StringResource, types, json, array, Context, EntryInfo, Entry, List, Group,
            SearchList, RDFGraph, Graph, User, exports) {

    /**
     * A module that contain utility factory methods.
     * @module store/factory
     */

	var sortObj = {sortBy: "title", prio: "List"};
	var defaultLimit = 20;

	var getContextForEntry = function(entryURI, entryStore) {
		var baseURI = entryStore.getBaseURI();
		var contextId = entryURI.substr(baseURI.length, entryURI.indexOf("/", baseURI.length)-baseURI.length);
		var contexts = entryStore.getCachedContextsIdx();
		var context = contexts[contextId];
		if (!context) {
			context = new Context(baseURI+"_contexts/entry/"+contextId, baseURI+contextId, entryStore);
			contexts[contextId] = context;
		}
		return context;
	};

	var transformRights = function(rights) {
		var o = {}, r = rights || [];
		for(var n=0;n<r.length;n++){
			o[r[n]] = true;
		}
		return o;
	};

	var _updateOrCreateResource = function(entry, data, force) {
		data = data || {};
        var resource = entry.getResource();
		if (!resource) {
			switch(entry.getEntryInfo().getGraphType()) {
                case types.GT.CONTEXT: //Synchronous resource, asynchronous methods.
					resource = getContextForEntry(entry.getResourceURI()+"/", entry.getEntryStore()); //Dummy URL to find the right context.
				break;
                case types.GT.LIST: //Synchronous resource, asynchronous methods.
                case types.GT.GROUP: //Synchronous resource, asynchronous methods.
                    if (entry.isGroup()) {
                        resource = new Group(entry.getURI(), entry.getResourceURI(), entry.getEntryStore());
                    } else {
                        resource = new List(entry.getURI(), entry.getResourceURI(), entry.getEntryStore());
                    }
                    var base = entry.getContext().getOwnResourceURI()+"/entry/";
                    if (data.resource && data.resource.children) {
                        var children = array.map(data.resource.children, function(child) {
                            return exports.updateOrCreate(base+child.entryId, child, entry.getEntryStore());
                        });
                        resource._update(data.resource, children);
                    }
                    break;
                case types.GT.USER: //Asynchronous resource, synchronous getters.
                    if (force || data.resource != null) {
                        resource = new User(entry.getURI(), entry.getResourceURI(), entry.getEntryStore(), data.resource || {});
                    }
                    break;
                case types.GT.STRING:
                    if (force || data.resource != null) {
                        resource = new StringResource(entry.getURI(), entry.getResourceURI(), entry.getEntryStore(), data.resource || "");
                    }
                    break;
				case types.GT.GRAPH: //Sync or Async?
					if (force || data.resource != null) {
                        resource = new RDFGraph(entry.getURI(), entry.getResourceURI(), entry.getEntryStore(), data.resource || {});
                    }
					break;
			}
			entry._resource = resource;
            return;
		}

		if (entry._resource == null || data.resource == null) {
			return;
		}
		
		if (resource._update) {
			if (entry.isList() || entry.isGroup()) {
				var base = entry.getContext().getOwnResourceURI()+"/entry/";
                if (data.resource && data.resource.children) {
                    var children = array.map(data.resource.children, function(child) {
                        return exports.updateOrCreate(base+child.entryId, child, entry.getEntryStore());
                    });
                    resource._update(data.resource, children);
                }
			} else {
				resource._update(data.resource);
			}
		}
	};

	var _updateEntry = function(entry, data) {
        entry._metadata = data.metadata ? new Graph(data.metadata) : null;
        entry._cachedExternalMetadata = data["cached-external-metadata"] ? new Graph(data["cached-external-metadata"]) : null;
        entry._extractedMetadata = data["extracted-metadata"] ? new Graph(data["extracted-metadata"]) : null;
        entry._relation = data.relations ? new Graph(data.relations): new Graph();
        entry._rights = transformRights(data.rights);
        //var ei = entry.getEntryInfo();
        //ei._alias = data.alias;
        //ei._name = data.name;
			
		//TODO fix all these other data. Move some into resource create/update methods.
		/* 
			if (data.size) {
				entry._childCount = data.size;
			}
				
			if(data.quota){
				entry.quota = {};
				if(data.quota.quota) {
					entry.quota.quota= data.quota.quota;
				}
				if (data.quota.fillLevel) {
					entry.quota.fillLevel = data.quota.fillLevel;
				}
				else {
					entry.quota.fillLevel = 0;
				}
				entry.quota.hasDefaultQuota = false;
				if(data.quota.hasDefaultQuota){
					entry.quota.hasDefaultQuota = data.quota.hasDefaultQuota
				}
			}*/			
			return entry;
	};
	
	exports.inMemoryEntryStore = function() {
			return null;
	};
	exports.getContext = function(entryStore, contextEntryURI) {
		var baseURI = entryStore.getBaseURI();
		var contextsBaseURI = baseURI+"_contexts/entry/";
		var contextId = contextEntryURI.substr(contextsBaseURI.length);
		var contexts = entryStore.getCachedContextsIdx();
		var context = contexts[contextId];
		if (!context) {
			context = new Context(contextEntryURI, baseURI+contextId, entryStore);
			contexts[contextId] = context;
		}
		return context;
	};
	exports.getList = function(entryStore, entryURI) {
		var cache = entryStore.getCache();
		var entry = cache.get(entryURI);
		if (!entry) {  //If no entry is in cache, create an empty entry
			var ei = new EntryInfo(entryURI, new Graph(), entryStore); //Assuming there is an info object... TODO check so not info_stub remains in rest layer.
			entry = new Entry(getContextForEntry(entryURI, entryStore), ei, entryStore);
            var resourceURI = entryURI.replace("/entry/", "/resource/");
			entry._resource = new List(entryURI, resourceURI, entryStore);
			cache.cache(entry, true); //Add to cache silently.
			entry.setRefreshNeeded(true);  //Make sure it needs to be updated before accessed.
		}
		return entry._resource; //Returning only the list which has no reference to the entry isolates the entry from beeing accessed before refreshed.
	};
	exports.updateOrCreate = function(entryURI, data, entryStore) {
        var cache = entryStore.getCache();
        var entry = cache.get(entryURI);
        if (entry) {
            entry.getEntryInfo().setGraph(new Graph(data.info));
        } else {
            var ei = new EntryInfo(entryURI, new Graph(data.info), entryStore); //Assuming there is an info object... TODO check so not info_stub remains in rest layer.
            entry = new Entry(getContextForEntry(entryURI, entryStore), ei, entryStore);
        }
        _updateEntry(entry, data);
        _updateOrCreateResource(entry, data);
        cache.cache(entry); //Add to or refresh the cache.
        return entry;
    };
    exports.updateOrCreateResource = _updateOrCreateResource;
	exports.update = function(entry, data) {
        entry.getEntryInfo().setGraph(new Graph(data.info));
        _updateOrCreateResource(entry, data);
        _updateEntry(entry, data);
        entry.getEntryStore().getCache().cache(entry); //Add to or refresh the cache.
    };
	exports.createSearchList = function(entryStore, query) {
		return new SearchList(entryStore, query);
	};
	exports.extractSearchResults = function(data, list, entryStore) {
		//Update or create all entries recieved.
		data.resource.offset = data.resource.offset || data.offset; //TODO change rest api so offset is inside of resource.
		data.resource.size = data.resource.size || data.results; //TODO change rest api so size is inside of resource.
		var baseURI = entryStore.getBaseURI();
		var entries = array.map(data.resource.children, function(child) {
			return exports.updateOrCreate(baseURI+child.contextId+"/entry/"+child.entryId, child, entryStore);
		});
		list._update(data.resource, entries);
		return entries;
	};
	exports.getMetadataURI = function(entryURI) {
			return entryURI.replace("/entry/", "/metadata/");
	};

	exports.getCachedExternalMetadataURI = function(entryURI) {
			return entryURI.replace("/entry/", "/cached-external-metadata/");
	};

    exports.getId = function(uri) {
        return uri.substr(uri.lastIndexOf("/")+1);
    };

    exports.getEntryURI = function(entryStore, contextId, entryId) {
        return entryStore.getBaseURI()+contextId+"/entry/"+entryId;
    };

    exports.getURIFromCreated = function(data, context) {
        return context.getOwnResourceURI()+"/entry/"+data.entryId;
    };
	/**
	 *  params contains:
	 *   The following attributes are considered:
	 *   limit - only a limited number of children are loaded, -1 means no limit, 0 or undefined means default limit.
	 *   offset - only children from offest and forward is returned, has to be positive to take effect.
	 *   sort - information on how to sort the children , 
	 *          if sort is not provided this entry will not be sorted now and not later either,
	 *          if sort is given as null the defaults of the factory will be used.
	 *          if sort is given as an emtpy object sorting is active for this entry but the natural order is used for now.
	 *          If sort is given as a non emtpy object the following attributes are taken into account:
	 *      sortBy - the attribute instructs which metadata field to sort the children by, that is title, created, modified, or size.
	 *      lang - if sort is title and the title is provided in several languages a prioritized language can be given.
	 *      prio - allows specific builtintypes to be prioritized (e.g. show up in the top of the list).
	 *      descending - if true the children are shown in descending order.
	 *  @return {String} in the form of a new URI.
	 */
	exports.getEntryLoadURI = function(entryURI, params) {
			params = params || {};
			var strL = "";
			if (params.limit > 0) {
				strL = "&limit="+params.limit;
			} else{
				strL = "&limit="+defaultLimit;
			}
			var strO = params.offset == null || params.offset === 0 ? "" : "&offset="+params.offset;
			var sort = params.sort == null ? sortObj : params.sort;
			var strSort = "";
			var strDesc = "";
			var strPrio = "";
			if (sort != null) {
				strSort = sort.sortBy == null ? "" : "&sort="+sort.sortBy;
				strDesc = sort.descending === true  ? "&order=desc" : "";
				strPrio = sort.prio == null ? "" : "&prio="+sort.prio;
				//TODO lang remains.		
			}
			return entryURI+"?includeAll"+strL+strO+strSort+strDesc+strPrio;
	};

	exports.getEntryCreateURI = function(prototypeEntry, parentListEntry) {
			var uri = prototypeEntry.getContext().getOwnResourceURI()+"?";
			if (prototypeEntry) {
				var ei = prototypeEntry.getEntryInfo();
                if (prototypeEntry.getSpecificId() != null) {
                    uri = uri+"id="+prototypeEntry.getSpecificId()+"&";
                }
				if (prototypeEntry.isLink()) {
					uri = uri+"resource="+encodeURIComponent(prototypeEntry.getResourceURI())+"&";				
				}
				if (prototypeEntry.isReference() || prototypeEntry.isLinkReference()) { //external metadata
                    uri = uri+"resource="+encodeURIComponent(prototypeEntry.getResourceURI())+"&";
                    uri = uri+"cached-external-metadata="+encodeURIComponent(ei.getExternalMetadataURI())+"&";
				}
				if (ei.getEntryType() !== types.ET.LOCAL) { //local, link, linkreference, reference
					uri = uri+"entrytype="+ ei.getEntryType().toLowerCase()+ "&";
				}
				if (ei.getResourceType() !== types.RT.INFORMATIONRESOURCE) { //informationresource, namedresource
					//TODO Bug in REST layer, should be resourcetype, is now informationresource innstead
                    uri = uri+"informationresource=false&";
				}
				if (ei.getGraphType() != types.GT.NONE) {
                    uri = uri+"graphtype="+ ei.getGraphType().toLowerCase() + "&";
				}
			}
			if (parentListEntry) {
				uri = uri+"list="+parentListEntry.getResourceURI()+"&";
			}
			return uri.slice(0,-1);
	};

	exports.getEntryCreatePostData = function(prototypeEntry) {
			var postData = {}, empty = true;
			var md = prototypeEntry.getMetadata();
			if (md != null && !md.isEmpty()) {
				postData.metadata = md.exportRDFJSON();
				empty = false;
			}
			var re = prototypeEntry.getResource();
			if (re != null && re.getSource != null) {
				postData.resource = re.getSource();
				empty = false;
			}
			var ei = prototypeEntry.getEntryInfo().getGraph();
			if (ei != null && !ei.isEmpty()) {
				postData.info = ei.exportRDFJSON();
				empty = false;
			}
			var cemd = prototypeEntry.getCachedExternalMetadata();
			if (cemd != null && !cemd.isEmpty()) {
				postData["cached-external-metadata"] = cemd.exportRDFJSON();
				empty = false;
			}
			return empty ? "" : json.stringify(postData);
	};
    /**
     * @param {store/Entry} entry
     * @param {store/Entry} fromListEntry
     * @param {store/Entry} toListEntry
     * @param {String} baseURI
     * @returns {string}
     */
	exports.getMoveURI = function(entry, fromListEntry, toListEntry, baseURI) {
			var euri = entry.getURI().substr(baseURI.length); //Only send something like 3/entry/2
			var furi = fromListEntry.getResourceURI().substr(baseURI.length);
			return toListEntry.getResourceURI()+"?moveEntry="+euri+"&fromList="+furi;
	};
	
	exports.getProxyURI = function(baseURI, uri, formatHint) {
			var url = baseURI+"proxy?url="+encodeURIComponent(uri);
			if (formatHint != null) {
				url += "&fromFormat="+formatHint;
			}
			return url;
	};
	exports.setSort = function(sortObject) {
			sortObj = sortObject;
	};
	exports.getSort = function() {
			return sortObj;
	};
	exports.getDefaultLimit = function() {
			return defaultLimit;
	};
	exports.setDefaultLimit = function(limit) {
			defaultLimit = limit;
	};

    return exports;
});