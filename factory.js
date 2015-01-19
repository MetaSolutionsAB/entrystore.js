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
     * This module contains utility methods that encapsulates EntryStores REST layer from the rest of the code.
     * It is intended to be used internally by the EntryStore.js API, not by application developers.
     *
     * Hence, **you should avoid using factory methods directly in application code as there are most probably
     * other ways to achieve the same thing. Most likely by using method in {@link store/EntryStore}!**
     *
     * The utility methods are currently not visible as they are not documented yet.
     * (The methods cannot be marked as private as they need to be used throughout the API.)
     *
     * @exports store/factory
     * @namespace
     */
    var factory = exports;

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
        var resource = entry.getResource(true);
		if (!resource) {
			switch(entry.getEntryInfo().getGraphType()) {
                case types.GT_CONTEXT: //Synchronous resource, asynchronous methods.
					resource = getContextForEntry(entry.getResourceURI()+"/", entry.getEntryStore()); //Dummy URL to find the right context.
				break;
                case types.GT_LIST: //Synchronous resource, asynchronous methods.
                case types.GT_GROUP: //Synchronous resource, asynchronous methods.
                    if (entry.isGroup()) {
                        resource = new Group(entry.getURI(), entry.getResourceURI(), entry.getEntryStore());
                    } else {
                        resource = new List(entry.getURI(), entry.getResourceURI(), entry.getEntryStore());
                    }
                    var base = entry.getContext().getResourceURI()+"/entry/";
                    if (data.resource && data.resource.children) {
                        var children = array.map(data.resource.children, function(child) {
                            return factory.updateOrCreate(base+child.entryId, child, entry.getEntryStore());
                        });
                        resource._update(data.resource, children);
                    }
                    break;
                case types.GT_USER: //Asynchronous resource, synchronous getters.
                    if (force || data.resource != null) {
                        resource = new User(entry.getURI(), entry.getResourceURI(), entry.getEntryStore(), data.resource || {});
                    }
                    break;
                case types.GT_STRING:
                    if (force || data.resource != null) {
                        resource = new StringResource(entry.getURI(), entry.getResourceURI(), entry.getEntryStore(), data.resource || "");
                    }
                    break;
				case types.GT_GRAPH: //Sync or Async?
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
				var base = entry.getContext().getResourceURI()+"/entry/";
                if (data.resource && data.resource.children) {
                    var children = array.map(data.resource.children, function(child) {
                        return factory.updateOrCreate(base+child.entryId, child, entry.getEntryStore());
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

	factory.getContext = function(entryStore, contextEntryURI) {
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
	factory.getList = function(entryStore, entryURI) {
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
	factory.updateOrCreate = function(entryURI, data, entryStore) {
        var cache = entryStore.getCache();
        var entry = cache.get(entryURI);
        if (entry) {
            entry.getEntryInfo().setGraph(new Graph(data.info));
        } else {
            var ei = new EntryInfo(entryURI, new Graph(data.info), entryStore); //Assuming there is an info object... TODO check so not info_stub remains in rest layer.
            entry = new Entry(getContextForEntry(entryURI, entryStore), ei);
        }
        _updateEntry(entry, data);
        _updateOrCreateResource(entry, data);
        cache.cache(entry); //Add to or refresh the cache.
        return entry;
    };
    factory.updateOrCreateResource = _updateOrCreateResource;
	factory.update = function(entry, data) {
        entry.getEntryInfo().setGraph(new Graph(data.info));
        _updateOrCreateResource(entry, data);
        _updateEntry(entry, data);
        entry.getEntryStore().getCache().cache(entry); //Add to or refresh the cache.
    };
	factory.createSearchList = function(entryStore, query) {
		return new SearchList(entryStore, query);
	};
	factory.extractSearchResults = function(data, list, entryStore) {
		//Update or create all entries recieved.
		data.resource.offset = data.resource.offset || data.offset; //TODO change rest api so offset is inside of resource.
		data.resource.size = data.resource.size || data.results; //TODO change rest api so size is inside of resource.
		var baseURI = entryStore.getBaseURI();
		var entries = array.map(data.resource.children, function(child) {
			return factory.updateOrCreate(baseURI+child.contextId+"/entry/"+child.entryId, child, entryStore);
		});
		list._update(data.resource, entries);
		return entries;
	};
	factory.getMetadataURI = function(entryURI) {
        return entryURI.replace("/entry/", "/metadata/");
	};

	factory.getCachedExternalMetadataURI = function(entryURI) {
        return entryURI.replace("/entry/", "/cached-external-metadata/");
	};

    factory.getId = function(uri) {
        return uri.substr(uri.lastIndexOf("/")+1);
    };

    factory.getEntryURI = function(entryStore, contextId, entryId) {
        return entryStore.getBaseURI()+contextId+"/entry/"+entryId;
    };

    factory.getResourceURI = function(entryStore, contextId, entryId) {
        return entryStore.getBaseURI()+contextId+"/resource/"+entryId;
    };

    factory.getURIFromCreated = function(data, context) {
        return context.getResourceURI()+"/entry/"+data.entryId;
    };

	factory.getEntryLoadURI = function(entryURI, params) {
			params = params || {};
			var strL = "";
			if (params.limit > 0 || params.limit === -1) {
				strL = "&limit="+params.limit;
			} else {
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

	factory.getEntryCreateURI = function(prototypeEntry, parentListEntry) {
			var uri = prototypeEntry.getContext().getResourceURI()+"?";
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
				if (ei.getEntryType() !== types.ET_LOCAL) { //local, link, linkreference, reference
					uri = uri+"entrytype="+ ei.getEntryType().toLowerCase()+ "&";
				}
				if (ei.getResourceType() !== types.RT_INFORMATIONRESOURCE) { //informationresource, namedresource
					//TODO Bug in REST layer, should be resourcetype, is now informationresource innstead
                    uri = uri+"informationresource=false&";
				}
				if (ei.getGraphType() != types.GT_NONE) {
                    uri = uri+"graphtype="+ ei.getGraphType().toLowerCase() + "&";
				}
			}
			if (parentListEntry) {
				uri = uri+"list="+parentListEntry.getResourceURI()+"&";
			}
			return uri.slice(0,-1);
	};

	factory.getEntryCreatePostData = function(prototypeEntry) {
			var postData = {}, empty = true;
			var md = prototypeEntry.getMetadata();
			if (md != null && !md.isEmpty()) {
				postData.metadata = md.exportRDFJSON();
				empty = false;
			}
			var re = prototypeEntry.getResource(true);
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

	factory.getMoveURI = function(entry, fromListEntry, toListEntry, baseURI) {
			var euri = entry.getURI().substr(baseURI.length); //Only send something like 3/entry/2
			var furi = fromListEntry.getResourceURI().substr(baseURI.length);
			return toListEntry.getResourceURI()+"?moveEntry="+euri+"&fromList="+furi;
	};

	factory.getProxyURI = function(baseURI, uri, formatHint) {
			var url = baseURI+"proxy?url="+encodeURIComponent(uri);
			if (formatHint != null) {
				url += "&fromFormat="+formatHint;
			}
			return url;
	};
	factory.setSort = function(sortObject) {
			sortObj = sortObject;
	};
	factory.getSort = function() {
			return sortObj;
	};
	factory.getDefaultLimit = function() {
			return defaultLimit;
	};
	factory.setDefaultLimit = function(limit) {
			defaultLimit = limit;
	};

    return factory;
});