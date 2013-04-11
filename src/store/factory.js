/*global define*/
define([
	"dojo/json",
	"./Context",
	"./EntryInfo",
	"./Entry",
	"rdfjson/Graph"
], function(json, Context, EntryInfo, Entry, Graph) {

	var getContextForEntry = function(entryURI, entrystore) {
		var baseURI = entrystore.getBaseURI();
		var contextId = entryURI.substr(baseURI.length, entryURI.indexOf("/", baseURI.length));
		var context = entryStore.contexts[contextId];
		if (!context) {
			context = new Context(baseURI+"_contexts/entry/"+contextId, baseURI+contextId, entrystore);
			entryStore.contexts[contextId] = context;
		}
		return context;
	};
	var transformRights = function(rights) {
		var o = {}, rights = rights || [];
		for(var n=0;rights.length;n++){
			o[rights[n]] = true;
		}
	};

	var updateResource = function(entry, data) {
		var resource = entry.getResource();
		if (resource && resource._update) {
			resource._update(data);
		}
	};	
	var createResource = function(entry, data) {
		//TODO fix all other resource types create/update.
		switch(entry.getEntryInfo().getGraphType()) {
			case "context":
				entry._resource = getContextForEntry(entry.getResourceURI()+"/"); //Dummy URL to find the right context.
			break;
			case "user":
			break;
			case "group":
			break;
			case "list":
			break;
		};
	};
	
	return {
		createOrUpdate: function(entryURI, data, entryStore) {
			var cache = entryStore.getCache();
			var entry = cache.get(entryURI);
			if (entry) {
				entry.getEntryInfo().setGraph(new Graph(data.info));
				updateResource(entry, data);
			} else {
				var ei = new EntryInfo(entryURI, new Graph(data.info)); //Assuming there is an info object... TODO check so not info_stub remains in rest layer.
				entry = new Entry(getContextForEntry(entryURI, entryStore), ei);
				createResource(entry, data);
			}
			 
			entry._metadata = data.metadata ? new Graph(data.metadata) : null;
			entry._externalMetadata = data["cached-external-metadata"] ? new Graph(data["cached-external-metadata"]) : null;
			entry._extractedMetadata = data["extracted-metadata"] ? new Graph(data["extracted-metadata"]) : null;
			entry._relation = data.relations ? new Graph(data.relations): null;
			entry._rights = transformRights(data.rights);
			entry._alias = data.alias; //Move to entryinfo?
			entry._name = data.name; //Move to entryinfo?

			cache.cache(entry); //Add to or refresh the cache.

			
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
		},
		
		/**
		 *  params contains:
		 *   The following attributes are considered:
		 *   limit - only a limited number of children are loaded, -1 means no limit, 0 or undefined means default limit.
		 *   offset - only children from offest and forward is returned, has to be positive to take effect.
		 *   sort - information on how to sort the children , 
		 *          if sort is not provided this entry will not be sorted now and not later either,
		 *          if sort is given as null the defaults of communicator will be used.
		 *          if sort is given as an emtpy object sorting is active for this entry but the natural order is used for now.
		 *          If sort is given as a non emtpy object the following attributes are taken into account:
		 *      sortBy - the attribute instructs which metadata field to sort the children by, that is title, created, modified, or size.
		 *      lang - if sort is title and the title is provided in several languages a prioritized language can be given.
		 *      prio - allows specific builtintypes to be prioritized (e.g. show up in the top of the list).
		 *      descending - if true the children are shown in descending order.
		 *  @return {String} in the form of a new URI.
		 */
		getEntryLoadURI: function(entryURI, params) {
			var strL = "";
			if (params.limit === 0) {
				strL = "&limit="+defaultLimit;
			} else if (params.limit > 0) {
				strL = "&limit="+params.limit;
			}
			var strO = params.offset == null || params.offset === 0 ? "" : "&offset="+params.offset;
			var sort = params.sort == null ? sortObj : params.sort;
			var strSort = "";
			var strDesc = "";
			var strPrio = "";
			if (sort !== undefined) {
				strSort = sort.sortBy == undefined ? "" : "&sort="+sort.sortBy;
				strDesc = sort.descending === true  ? "&order=desc" : "";
				strPrio = sort.prio == undefined ? "" : "&prio="+sort.prio;	
				//TODO lang remains.		
			}
			return entryURI+strL+strO+strSort+strDesc+strPrio;
		},

		getEntryCreateURI: function(context, prototypeEntry, parentListEntry) {
			var uri = context.getOwnResourceURI()+"?";
			if (prototypeEntry) {
				var ei = prototypeEntry.getEntryInfo();
				if (entryPrototype.isLink()) {
					uri = uri+"resource="+encodeURIComponent(prototypeEntry.getResourceURI())+"&";				
				}
				if (prototypeEntry.isReference() || prototypeEntry.isLinkReference()) { //external metadata
					uri = uri+"metadata="+encodeURIComponent(ei.getExternalMetadataURI())+"&";	
				}
				if (ei.getEntryType() !== "local") { //local, link, linkreference, reference
					uri = uri+"locationtype="+ ei.getEntryType()+ "&";   //TODO change in REST layer to entrytype 
				}
				if (ei.getResourceType() !== "informationresource") { //informationresource, namedresource
					uri = uri+"representationtype="+ ei.getRepresentationType()+ "&"; //TODO change in REST layer to resourcetype
				}
				if (ei.getGraphType() != "none") {
					uri = uri+"builtintype="+ ei.getGraphType() + "&"; //TODO change in REST layer to graphtype
				}
			}
			if (parentListEntry) {
				uri = uri+"listURI="+parentListEntry.getResourceURI()+"&";			
			}
			return uri.slice(0,-1);
		},

		getEntryCreatePostData: function(prototypeEntry) {
			if (!prototypeEntry) {
				return "";
			}
			var postData = {};
			var md = prototypeEntry.getMetadata();
			if (!md.isEmpty()) {
				postData.metadata = md.exportRDFJSON();
			}
			var re = prototypeEntry.getResource();
			if (re != null && re.getSource != null) {
				postData.resource = re.getSource();
			}
			var ei = prototypeEntry.getEntryInfo().getGraph();
			if (!ei.isEmpty()) {
				postData.info = ei.exportRDFJSON();
			}
			var cemd = prototypeEntry.getCachedExternalMetadata();
			if (!cemd) {
				postData["cached-external-metadata"] = cemd.exportRDFJSON();
			}
			return json.stringify(postData);
		},
		getMoveURI: function(entry, fromListEntry, toListEntry, baseURI) {
			var euri = entry.getURI().substr(baseURI.length); //Only send something like 3/entry/2
			var furi = fromListEntry.getResourceURI().substr(baseURI.length);
			return toListEntry.getResourceUri()+"?moveEntry="+euri+"&fromList="+furi;
		},
	
		getProxyURI: function(baseURI, uri, formatHint) {
			var url = baseURI+"proxy?url="+encodeURIComponent(uri);
			if (formatHint != null) {
				url += "&fromFormat="+formatHint;
			}
			return url;
		}
	};
});