/*global define*/
define([
	"dojo/_base/lang",
	"dojo/request",
	"dojo/request/iframe",
	"dojo/json",
	"dojo/has", 
	"dojo/_base/sniff",
	"dojo/_base/window",
	"dojo/Deferred"
], function(lang, request, iframe, json, has, sniff, win, Deferred) {

	var sortObj = {sortBy: "title", prio: "List"};
	var defaultLimit = 20;
	var headers = {
		"Accept": "application/json",
		"Content-Type": "application/json; charset=UTF-8"
	};

	var communicator = {
		setSort: function(sortObj) {
			sortObj = sortObj;
		},
		getSort: function() {
			return sortObj;
		},
		getDefaultLimit: function() {
			return defaultLimit;
		},
		setDefaultLimit: function(limit) {
			defaultLimit = limit;
		},
		// Authentication placeholder to be overridden to set login details
		insertAuthArgs: function(xhrArgs) {
			return xhrArgs;
		},
		// Authentication placeholder to be overridden to set login details
		insertAuthParams: function(url) {
			return url;
		},
		
		get: function(uri, onLoad, onError) {
			return request.get(uri, communicator.insertAuthArgs({
				preventCache: true,
				handleAs: "json",
				headers: headers
			}));
		},
		
		/**
		 * @return a promise on which you can call .then on.
		 */
		post: function(uri, data) {
			return request.post(uri, communicator.insertAuthArgs({
				preventCache: true,
				handleAs: "json",
				data: data,
				headers: headers
			}));
		},
		
		create: function(uri, data) {
			var d = new Deferred();
			communicator.post(uri, data).response.then(function(response) {
				var location = response.getHeader('Location');
				d.resolve(location);
			},function(err) {
				d.reject("Failed creating. "+err);
			});
			return d.promise;
		},

		/**
		 * @return a promise on which you can call .then on.
		 */
		put: function(uri, data, modDate) {
			var loc_headers = lang.clone(headers);
			if (modDate) {
				loc_headers["If-Unmodified-Since"] = modDate;			
			}
			return request.put(uri, communicator.insertAuthArgs({
				preventCache: true,
				handleAs: "json",
				data: json.stringify(data),
				headers: loc_headers
			}));
		},
		
		/**
		 * @param {String} the resource to delete.
		 * @return a promise.
		 */
		del: function(uri, recursive){
			return request.del(uri, communicator.insertAuthArgs({
				preventCache: true,
				handleAs: "json",
				headers: headers
			}));
		},
		
		putFile: function(resourceURI, inputNode, onSuccess, onError) {
			  if(!inputNode.value){ return; }
	          
	          var _newForm; 
	          if(has("ie")){
	                  // just to reiterate, IE is a steaming pile of shit. 
	                  _newForm = document.createElement('<form enctype="multipart/form-data" method="post">');
	                  _newForm.encoding = "multipart/form-data";
	          }else{
	                  // this is how all other sane browsers do it
	                  _newForm = document.createElement('form');
	                  _newForm.setAttribute("enctype","multipart/form-data");
	                  _newForm.setAttribute("method","post");
	          }
	          
	          _newForm.appendChild(inputNode);
	          win.body().appendChild(_newForm);
	
	          iframe(communicator.insertAuthParams(resourceURI+(resourceURI.indexOf("?") < 0 ? "?" : "&")+"method=put&textarea=true"),
				{
					preventCache: true,
	                handleAs: "json",
	                form: _newForm
				}).then(onSuccess, onError);
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

		getEntryCreateURI: function(contextEntry, prototypeEntry, parentListEntry) {
			var uri = contextEntry.getResourceURI()+"?";
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

		moveEntry: function(entry, fromList, toList) {
			var uri = toList.getResourceUri()+"?moveEntry="+entry.getContext().getId()+"/entry/"+entry.getId()+"&fromList="+fromList.getContext().getId()+"/resource/"+fromList.getId();
			return request.post(uri, communicator.insertAuthArgs({
				preventCache: true,
				handleAs: "json",
				headers: headers
			})).then(function() {
				entry.setRefreshNeeded();
				fromList.setRefreshNeeded();
				toList.setRefreshNeeded();
			});
		},
	
		loadViaSCAMProxy: function(params) {
			var url = __confolio.application.getRepository()+"proxy?url="+encodeURIComponent(params.url);
			if (params.from != null) {
				url += "&fromFormat="+params.from;
			}
			var req = request.get(communicator.insertAuthParams(url), {
				preventCache: true,
				handleAs: params.handleAs || "json",
				headers: headers}
			).then(params.onSuccess, params.onError || function(mesg) {
				console.error(mesg);
			});
		}
	};
	return communicator;
});