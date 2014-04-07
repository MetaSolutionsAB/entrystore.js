/*global define*/
define([
    'dojo/_base/array',
    "require",
	"dojo/_base/lang",
    "dojo/Deferred",
	"dojo/request",
	"dojo/has"
], function(array, require, lang, Deferred, request, has) {

	var headers = {
		"Accept": "application/json",
		"Content-Type": "application/json; charset=UTF-8",
        "X-Requested-With": null
	};

	var rest = {
		// Authentication placeholder to be overridden to set login details
		insertAuthArgs: function(xhrArgs) {
            if (rest._authScheme === "basic") {
                xhrArgs.user = rest._user;
                xhrArgs.password = rest._password;
            }
            return xhrArgs;
		},
		// Authentication placeholder to be overridden to set login details
		insertAuthParams: function(url) {
			return url;
		},

        /**
         *
         * @param credentials
         * @returns {dojo.promise.Promise}
         */
        auth: function(credentials) {
            delete headers.cookie;
            if (credentials) {
                this._cookie_credentials = credentials;
                var data = {
                    "auth_username": credentials.user,
                    "auth_password": credentials.password,
                    "auth_maxage": credentials.maxAge != null ? credentials.maxAge : 604800 //in seconds, 86400 is default and corresponds to a day.
                };
                if (has("host-browser")) {
                    return rest.post(credentials.base + "auth/cookie", data);
                } else {
                    var p = rest.post(credentials.base + "auth/cookie", data);
                    return p.response.then(function(response) {
                        var cookies = response.getHeader("set-cookie");
                        array.some(cookies, function(c) {
                            if (c.substring(0,11) === "auth_token=") {
                                headers.cookie = [c];
                            }
                        });
                    });
                }
            } else if (this._cookie_credentials) {
                return request.get(this._cookie_credentials.base + "auth/logout", {
                    preventCache: true,
                    handleAs: "json",
                    headers: headers,
                    withCredentials: true
                });
            }
        },

        /**
         * @param uri
         * @returns {dojo.promise.Promise}
         */
		get: function(uri) {
            var jsonp = false;
            if (has("host-browser")) {
                if (uri.indexOf(window.location.origin) !== 0
                    && uri.indexOf("/entry/") !== -1) {   //TODO check where jsonp is supported
                    jsonp = true;
                }
            }

            if (jsonp) {
                var d = new Deferred();
                require(["dojo/request/script"], function(script) {
                    var queryParameter = new RegExp('[?&]format=');
                    if(!queryParameter.test(uri)){
                        uri += (~uri.indexOf('?') ? '&' : '?') + 'format=application/json';
                    }
                    script.get(uri, {jsonp: "callback"}).then(function(data) {
                        d.resolve(data);
                    });
                });
                return d;
            } else {
                var d = request.get(uri, rest.insertAuthArgs({
                        preventCache: true,
                        handleAs: "json",
                        headers: headers,
                        withCredentials: true
                    })).response.then(function(response) {
                        if (response.status === 200) {
                            return response.data;
                        } else {
                            throw "Resource could not be loaded: "+response.text;
                        }
                    });
                return d;
            }
		},
		
		/**
		 * @param {String} uri to post to.
		 * @param {String} data to post
		 * @return a promise on which you can call .then on.
		 */
		post: function(uri, data) {
			return request.post(uri, rest.insertAuthArgs({
				preventCache: true,
				handleAs: "json",
				data: data,
				headers: headers,
                withCredentials: true
			}));
		},
		
		create: function(uri, data) {
			var d = new Deferred();
			rest.post(uri, data).response.then(function(response) {
				var location = response.getHeader('Location');
				d.resolve(location);
			},function(err) {
				throw "Failed creating. "+err;
			});
			return d.promise;
		},

		/**
		 * @param {String} uri the address to put to.
		 * @param {String} data the data to put.
		 * @param {Date} modDate a date to use for the HTTP if-unmodified-since header.
		 * @return a promise on which you can call .then on.
		 */
		put: function(uri, data, modDate) {
			var loc_headers = lang.clone(headers);
			if (modDate) {
				loc_headers["If-Unmodified-Since"] = modDate;			
			}
			return request.put(uri, rest.insertAuthArgs({
				preventCache: true,
				handleAs: "json",
				data: data,
				headers: loc_headers,
                withCredentials: true
			}));
		},
		
		/**
		 * @param {String} uri of the resource to delete.
         * @param {Boolean} recursive if true the store tries to delete any potential children entries
		 * @return a promise.
		 */
		del: function(uri, recursive){
			return request.del(uri, rest.insertAuthArgs({
				preventCache: true,
				handleAs: "json",
				headers: headers,
                withCredentials: true
			}));
		}
	};
	if (has("host-browser")) {
		require([
			"dojo/_base/window",
			"dojo/request/iframe"
			], function(win, iframe) {
				rest.putFile = function(resourceURI, inputNode, onSuccess, onError) {
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
		
		          iframe(rest.insertAuthParams(resourceURI+(resourceURI.indexOf("?") < 0 ? "?" : "&")+"method=put&textarea=true"),
					{
						preventCache: true,
		                handleAs: "json",
		                form: _newForm
					}).then(onSuccess, onError);
				}
		});
	}
	
	return rest;
});