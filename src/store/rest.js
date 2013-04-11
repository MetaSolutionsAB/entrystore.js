/*global define*/
define([
	"dojo/_base/lang",
	"dojo/request",
	"dojo/request/iframe",
	"dojo/has", 
	"dojo/_base/sniff",
	"dojo/_base/window",
	"dojo/Deferred"
], function(lang, request, iframe, has, sniff, win, Deferred) {

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
		
		get: function(uri) {
			return request.get(uri, communicator.insertAuthArgs({
				preventCache: true,
				handleAs: "json",
				headers: headers
			}));
		},
		
		/**
		 * @param {String} uri to post to.
		 * @param {String} data to post
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
		 * @param {String} uri the address to put to.
		 * @param {String} data the data to put.
		 * @param {Date} a date to use for the HTTP if-unmodified-since header.
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
		 * @param {String} uri of the resource to delete.
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
		}	
	};
	return communicator;
});