const has = require('dojo/has');
import superagent from 'superagent';
const jsonp = require('superagent-jsonp');

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
   * This class encapsulates functionality for communicating with the repository via Ajax calls.
   * Authentication is done via cookies and accept headers are in general set to
   * application/json behind the scenes.
   *
   * @exports store/Rest
   */
  const Rest = class {
    constructor() {
      this.timeout = 30000; // 30 seconds
      this.headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Requested-With': null,
      };
      const rest = this;
      /* TODO: @scazan uncomment this with a file upload solution
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
      */
    }
    /**
     * @param {object} credentials should contain attributes "user", "password", and "maxAge".
     * MaxAge is the amount of seconds the authorization should be valid.
     * @returns {xhrPromise}
     */
    auth(credentials) {
      delete this.headers.cookie;
      if (credentials.logout !== true) {
        const data = {
          auth_username: credentials.user,
          auth_password: credentials.password,
          // in seconds, 86400 is default and corresponds to a day.
          auth_maxage: credentials.maxAge != null ? credentials.maxAge : 604800,
        };
        if (has('host-browser')) {
          return this.post(`${credentials.base}auth/cookie`, data);
        }
        const p = this.post(`${credentials.base}auth/cookie`, data);
        return p.then((response) => {
          const cookies = response.headers['set-cookie'];
          cookies.some((c) => {
            if (c.substring(0, 11) === 'auth_token=') {
              this.headers.cookie = [c];
              return true;
            }
            return false;
          });
        });
      }

      const logoutRequestResult = superagent.get(`${credentials.base}auth/logout`)
        .query( {preventCache: parseInt(Math.random() * 10000, 10)} )
        .accept('application/json')
        .withCredentials()
        .timeout({ response: this.timeout });

      Object.entries(this.headers).map( keyVal => logoutRequestResult.set(keyVal[0], keyVal[1]) );

      return logoutRequestResult;
    }

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
      const locHeaders = Object.assign({}, this.headers);
      delete locHeaders['Content-Type'];

      let _uri = uri;
      let handleAs = 'json';
      if (format != null) {
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
          const queryParameter = new RegExp('[?&]format=');
          if (!queryParameter.test(_uri)) {
            _uri += `${_uri.includes('?') ? '&' : '?'}format=application/json`;
          }

          superagent.get(_uri)
            .use(jsonp({
                timeout: 160,
              })
            ) // Need this timeout to prevent an issue with superagent-jsonp: https://github.com/lamp/superagent-jsonp/issues/31
            .then( data => {
              resolve(data.body);
            }, (err) => {
              reject(err);
            });

        });
      }
      const getRequest = superagent.get(_uri)
        .accept(handleAs)
        .timeout({ response: this.timeout })
        .query( {preventCache: parseInt(Math.random() * 10000, 10)} )
        .withCredentials();

      Object.entries(locHeaders).map( keyVal => getRequest.set(keyVal[0], keyVal[1]) );

      return getRequest
        .then((response) => {
          if (response.status === 200) {
            return response.body;
          }
          throw new Error(`Resource could not be loaded: ${response.text}`);
        });
    }

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
      const locHeaders = Object.assign({}, this.headers);
      if (modDate) {
        locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
      }// multipart/form-data
      if (format) {
        locHeaders['Content-Type'] = format;
      }

      const postRequest = superagent.post(uri)
        .query( {'request.preventCache': parseInt(Math.random() * 10000, 10)} )
        .send( data )
      // serialize the object into a format that the backend is used to (no JSON strings)
        .serialize(obj =>
          Object.entries(obj)
          .map( keyVal =>
            keyVal[0] + "=" + keyVal[1] + "&"
          )
          .join("")
        )
        .withCredentials()
        .timeout({ response: this.timeout });

      Object.entries(locHeaders).map( keyVal => postRequest.set(keyVal[0], keyVal[1]) );

      return postRequest;
    }

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
      return this.post(uri, data).then((response) => {
        //let location = response.getHeader('Location');
        let location = response.headers['location'];
        // In some weird cases, like when making requests from file:///
        // we do not have access to headers.
        if (!location && response.body) {
          const idx = uri.indexOf('?');
          if (idx !== -1) {
            location = uri.substr(0, uri.indexOf('?'));
          } else {
            location = uri;
          }
          location += `/entry/${JSON.parse(response.body).entryId}`;
        }
        return location;
      });
    }

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
      const locHeaders = Object.assign({}, this.headers);
      if (modDate) {
        locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
      }
      if (format) {
        locHeaders['Content-Type'] = format;
      } else if (typeof data === 'object') {
        locHeaders['Content-Type'] = 'application/json';
      }

      const putRequest = superagent.put(uri)
        .query( {preventCache: parseInt(Math.random() * 10000, 10)} )
        .send( data )
        .withCredentials()
        .timeout({ response: this.timeout });

      Object.entries(locHeaders).map( keyVal => putRequest.set(keyVal[0], keyVal[1]) );

      return putRequest;
    }

    /**
     * Deletes a resource.
     *
     * @param {String} uri of the resource that is to be deleted.
     * @param {Date=} modDate a date to use for the HTTP if-unmodified-since header.
     * @return {xhrPromise}
     */
    del(uri, modDate) {
      const locHeaders = Object.assign({}, this.headers);
      delete locHeaders['Content-Type'];
      if (modDate) {
        locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
      }

      const deleteRequest = superagent.del(uri)
        .query( {preventCache: parseInt(Math.random() * 10000, 10)} )
        .withCredentials()
        .timeout({ response: this.timeout });

      Object.entries(locHeaders).map( keyVal => deleteRequest.set(keyVal[0], keyVal[1]) );

      return deleteRequest;
    }

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
      return this.put(uri, data, null, format);
    }
  };

export { Rest };

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
