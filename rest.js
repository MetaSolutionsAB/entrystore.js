define([
  'require',
  'dojo/request',
  'dojo/has',
], (require, request, has) => {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Requested-With': null,
  };
  const timeout = 30000; // 30 seconds

  /**
   * Check if requests will be to the same domain, i.e. no CORS.
   * Must be used in a browser environment.
   *
   * @param url
   * @returns {boolean}
   */
  const sameOrigin = (url) => {
    const a1 = document.createElement('a');
    const a2 = document.createElement('a');
    a1.href = url;
    a2.href = window.location.href;

    return a1.hostname === a2.hostname &&
      a1.port === a2.port &&
      a1.protocol === a2.protocol &&
      a2.protocol !== 'file:';
  };

  /**
   * Functionality for communicating with the repository via Ajax calls.
   * Authentication is done via cookies and accept headers are in general set to
   * application/json behind the scenes.
   *
   * @exports store/rest
   * @namespace
   */
  const rest = {
    /**
     * @param {object} credentials should contain attributes "user", "password", and "maxAge".
     * MaxAge is the amount of seconds the authorization should be valid.
     * @returns {xhrPromise}
     */
    auth(credentials) {
      delete headers.cookie;
      if (credentials.logout !== true) {
        const data = {
          auth_username: credentials.user,
          auth_password: credentials.password,
          // in seconds, 86400 is default and corresponds to a day.
          auth_maxage: credentials.maxAge != null ? credentials.maxAge : 604800,
        };
        if (has('host-browser')) {
          return rest.post(`${credentials.base}auth/cookie`, data);
        }
        const p = rest.post(`${credentials.base}auth/cookie`, data);
        return p.response.then((response) => {
          const cookies = response.getHeader('set-cookie');
          cookies.some((c) => {
            if (c.substring(0, 11) === 'auth_token=') {
              headers.cookie = [c];
              return true;
            }
            return false;
          });
        });
      }
      return request.get(`${credentials.base}auth/logout`, {
        preventCache: true,
        handleAs: 'json',
        headers,
        withCredentials: true,
        timeout,
      });
    },

    /**
     * Fetches data from the provided URI.
     * If a cross-domain call is made and we are in a browser environment a jsonp call is made.
     *
     * @param {string} uri - URI to a resource to fetch.
     * @param {string} format - the format to request as a mimetype.
     * @param {boolean} nonJSONP - stop JSONP handling (default false)
     * @returns {xhrPromise}
     */
    get(uri, format, nonJSONP = false) {
      let _uri = uri;
      let locHeaders = headers;
      let handleAs = 'json';
      if (format != null) {
        locHeaders = Object.assign({}, headers);
        locHeaders.Accept = format;
        switch (format) {
          case 'application/json': // This is the default in the headers.
            break;
          case 'appplication/xml':
          case 'text/xml':
            handleAs = 'xml';
            break;
          default: // All other situations, including text/plain.
            handleAs = 'text';
        }
      }

      // Use jsonp instead of CORS for GET requests when doing cross-domain calls, it is cheaper
      if (has('host-browser') && !sameOrigin(_uri) && !nonJSONP) {
        return new Promise((resolve, reject) => {
          require(['dojo/request/script'], (script) => {
            const queryParameter = new RegExp('[?&]format=');
            if (!queryParameter.test(_uri)) {
              _uri += `${_uri.indexOf('?') ? '&' : '?'}format=application/json`;
            }
            script.get(_uri, { jsonp: 'callback' }).then((data) => {
              resolve(data);
            }, (err) => {
              reject(err);
            });
          });
        });
      }
      return request.get(_uri, {
        preventCache: true,
        handleAs,
        headers: locHeaders,
        withCredentials: true,
        timeout,
      }).response.then((response) => {
        if (response.status === 200) {
          return response.data;
        }
        throw new Error(`Resource could not be loaded: ${response.text}`);
      });
    },

    /**
     * Posts data to the provided URI.
     *
     * @param {String} uri - an URI to post to.
     * @param {String|Object} data - the data to post. If an object the data is sent as form data.
     * @param {Date=} modDate a date to use for the HTTP if-unmodified-since header.
     * @param {string=} format - indicates the content-type of the data, default is
     * application/json, except if the data is an object in which case the default is
     * multipart/form-data.
     * @return {xhrPromise}
     */
    post(uri, data, modDate, format) {
      const locHeaders = Object.assign({}, headers);
      if (modDate) {
        locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
      }// multipart/form-data
      if (format) {
        locHeaders['Content-Type'] = format;
      }

      return request.post(uri, {
        preventCache: true,
        // handleAs: "json",
        data,
        headers: locHeaders,
        withCredentials: true,
        timeout,
      });
    },

    /**
     * Posts data to a factory resource with the intent to create a new resource.
     * That is, it posts data and expects a Location header back with information on the created
     * resource.
     *
     * @param {string} uri - factory resource, may include parameters.
     * @param {string|Object} data - the data that is to be posted as a string,
     * if an object is provided it will be serialized as json.
     * @returns {createPromise}
     */
    create(uri, data) {
      return rest.post(uri, data).response.then((response) => {
        let location = response.getHeader('Location');
        // In some weird cases, like when making requests from file:///
        // we do not have access to headers.
        if (!location && response.data) {
          const idx = uri.indexOf('?');
          if (idx !== -1) {
            location = uri.substr(0, uri.indexOf('?'));
          } else {
            location = uri;
          }
          location += `/entry/${JSON.parse(response.data).entryId}`;
        }
        return location;
      });
    },

    /**
     * Replaces a resource with a new representation.
     *
     * @param {string} uri the address to put to.
     * @param {string|Object} data - the data to put. If an object the data is sent as form data.
     * @param {Date=} modDate a date to use for the HTTP if-unmodified-since header.
     * @param {string=} format - indicates the content-type of the data, default is
     * application/json, except if the data is an object in which case the default is
     * multipart/form-data.
     * @return {xhrPromise}
     */
    put(uri, data, modDate, format) {
      const locHeaders = Object.assign({}, headers);
      if (modDate) {
        locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
      }
      if (format) {
        locHeaders['Content-Type'] = format;
      } else if (typeof data === 'object') {
        locHeaders['Content-Type'] = 'application/json';
      }
      return request.put(uri, {
        preventCache: true,
        // handleAs: "json",
        data,
        headers: locHeaders,
        withCredentials: true,
        timeout,
      });
    },

    /**
     * Deletes a resource.
     *
     * @param {String} uri of the resource that is to be deleted.
     * @param {Date=} modDate a date to use for the HTTP if-unmodified-since header.
     * @return {xhrPromise}
     */
    del(uri, modDate) {
      const locHeaders = Object.assign({}, headers);
      if (modDate) {
        locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
      }

      return request.del(uri, {
        preventCache: true,
        // handleAs: "json",
        headers: locHeaders,
        withCredentials: true,
        timeout,
      });
    },

    /**
     * Put a file to a URI.
     * In a browser environment a file is represented via an input tag which references
     * the file to be uploaded via its value attribute.
     * In node environments the file is represented as a stream constructed via
     * fs.createReadStream('file.txt').
     *
     * > _**Under the hood** the tag is moved into a form in an invisible iframe
     * which then is submitted. If there is a response it is provided in a textarea which
     * can be looked into since we are on the same domain._
     *
     * @param {string} uri the URI to which we will put the file.
     * @param {data} data - input tag or stream that may for instance correspond to a file
     * in a nodejs setting.
     * @param {string} format the format to handle the response as, either text, xml, html or json
     * (json is default).
     */
    putFile(uri, data, format) {
      return rest.put(uri, data, null, format);
//            throw "Currently not supported in a non-browser environment!";
    },
  };
  if (has('host-browser')) {
    require([
      'dojo/_base/window',
      'dojo/request/iframe',
    ], (win, iframe) => {
      rest.putFile = (uri, data, format) => {
        if (!data.value) {
          return undefined;
        }
        let _newForm;
        if (has('ie')) {
          // just to reiterate, IE is a steaming pile of shit.
          _newForm = document.createElement('<form enctype="multipart/form-data" method="post">');
          _newForm.encoding = 'multipart/form-data';
        } else {
          // this is how all other sane browsers do it
          _newForm = document.createElement('form');
          _newForm.setAttribute('enctype', 'multipart/form-data');
          _newForm.setAttribute('method', 'post');
          _newForm.style.display = 'none';
        }

        const oldParent = data.parentElement;
        const nextSibling = data.nextSibling;
        _newForm.appendChild(data);
        win.body().appendChild(_newForm);
        const cleanUp = () => {
          if (nextSibling) {
            oldParent.insertBefore(data, nextSibling);
          } else {
            oldParent.appendChild(data);
          }
          win.body().removeChild(_newForm);
        };

        return iframe(uri, {
          preventCache: true,
          handleAs: format || 'json',
          form: _newForm,
        }).then((res) => {
          cleanUp();
          return res;
        }, (e) => {
          cleanUp();
          throw e;
        });
      };
    });
  }

  return rest;
});

/**
 * @name xhrPromise
 * @extends dojo/promise/Promise
 * @class
 */

/**
 * @name xhrPromise#then
 * @param {xhrSuccessCallback} onSuccess
 * @param {xhrFailureCallback} onError
 */

/**
 * This is a succesfull callback method to be provided as first argument in a {@link entrypromise}
 *
 * @callback xhrSuccessCallback
 * @param {string|object|node}
 */

/**
 * This is a callback that will be called upon failure, it is supposed to be provided as second
 * argument in a {@link entrypromise}
 *
 * @callback xhrFailureCallback
 * @param {string} error
 * @param {object} ioArgs
 */

/**
 * @name createPromise
 * @extends xhrPromise
 * @class
 */

/**
 * @name xhrPromise#then
 * @param {createSuccessCallback} onSuccess
 * @param {xhrFailureCallback} onError
 */

/**
 * This is a succesfull callback method that provides a reference to the newly created object.
 *
 * @callback createSuccessCallback
 * @param {string} uri the URI of the newly created resource.
 */
