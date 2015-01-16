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

    /**
     * Functionality for communicating with the repository via Ajax calls.
     * Authentication is done via cookies and accept headers are in general set to
     * application/json behind the scenes.
     *
     * @exports store/rest
     * @namespace
     */
	var rest = {
        /**
         * @param {object} credentials should contain attributes "user", "password", and "maxAge".
         * MaxAge is the amount of seconds the authorization should be valid.
         * @returns {dojo/promise/Promise}
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
         * Fetches JSON data from the provided URI.
         * If a cross-domain call is made and we are in a browser environment a jsonp call is made.
         *
         * @param {string} uri - URI to a resource to fetch.
         * @returns {dojo/promise/Promise}
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
                var d = request.get(uri, {
                        preventCache: true,
                        handleAs: "json",
                        headers: headers,
                        withCredentials: true
                }).response.then(function(response) {
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
         * Posts data to the provided URI.
         *
		 * @param {String} uri - an URI to post to.
		 * @param {String|Object} data - the data to post either as a string or as an object that will be serialized as JSON.
		 * @return {dojo/promise/Promise}
		 */
		post: function(uri, data) {
            return request.post(uri, {
                preventCache: true,
                handleAs: "json",
                data: data,
                headers: headers,
                withCredentials: true
            });
		},

        /**
         * Posts data to a factory resource with the intent to create a new resource.
         * That is, it posts data and expects a Location header back with information on the created resource.
         *
         * @param {string} uri - factory resource, may include parameters.
         * @param {string|Object} data - the data that is to be posted as a string,
         * if an object is provided it will be serialized as json.
         * @returns {dojo/promise/Promise}
         */
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
         * Replaces a resource with a new representation.
         *
		 * @param {string} uri the address to put to.
		 * @param {string|Object} data - the data to put, either a string or a object that is serialized as json.
		 * @param {Date} modDate a date to use for the HTTP if-unmodified-since header.
		 * @return {dojo/promise/Promise}
		 */
		put: function(uri, data, modDate) {
			var loc_headers = lang.clone(headers);
			if (modDate) {
				loc_headers["If-Unmodified-Since"] = modDate;			
			}
			return request.put(uri, {
				preventCache: true,
				handleAs: "json",
				data: data,
				headers: loc_headers,
                withCredentials: true
			});
		},
		
		/**
         * Deletes a resource.
         *
		 * @param {String} uri of the resource that is to be deleted.
		 * @return {dojo/promise/Promise}
		 */
		del: function(uri){
			return request.del(uri, {
				preventCache: true,
				handleAs: "json",
				headers: headers,
                withCredentials: true
			});
		},

        /**
         * Put a file to a URI.
         * In a browser environment a file is represented via an input tag which references
         * the file to be uploaded via its value attribute.
         * In non-browser environments the file is typically represented as a file handle.
         *
         * > _**Under the hood** the tag is moved into a form in an invisible iframe
         * which then is submitted. If there is a response it is provided in a textarea which
         * can be looked into since we are on the same domain._
         *
         * @param {string} uri the URI to which we will put the file.
         * @param {data} data - input tag or file handle that corresponds to a file.
         * @todo implement in non-browser environment.
         */
        putFile: function(uri, data) {
            throw "Currently not supported in a non-browser environment!";
        }
	};
	if (has("host-browser")) {
		require([
			"dojo/_base/window",
			"dojo/request/iframe"
			], function(win, iframe) {

				rest.putFile = function(uri, data) {
                    if(!data.value){ return; }
                    var _newForm;
                    if(has("ie")){
                        // just to reiterate, IE is a steaming pile of shit.
                        _newForm = document.createElement('<form enctype="multipart/form-data" method="post">');
                        _newForm.encoding = "multipart/form-data";
                    } else {
                        // this is how all other sane browsers do it
                        _newForm = document.createElement('form');
                        _newForm.setAttribute("enctype","multipart/form-data");
                        _newForm.setAttribute("method","post");
                    }
		          
                    _newForm.appendChild(data);
                    win.body().appendChild(_newForm);

                    return iframe(
                        (uri+(uri.indexOf("?") < 0 ? "?" : "&")+"method=put&textarea=true"),
                        {
                            preventCache: true,
                            handleAs: "json",
                            form: _newForm
                        });
                };
		});
	}
	
	return rest;
});