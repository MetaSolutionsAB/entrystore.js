import md5 from 'blueimp-md5';
import superagent from 'superagent';
import xmldom from '@xmldom/xmldom';
import jsonp from 'superagent-jsonp';
import { isBrowser } from './utils.js';

/**
 * Check if requests will be to the same domain, i.e. no CORS.
 * Must be used in a browser environment.
 *
 * @param {string} url
 * @returns {boolean}
 */
const sameOrigin = (url) => {
  const a1 = document.createElement('a');
  const a2 = document.createElement('a');
  a1.href = url;
  a2.href = window.location.href;

  return (
    a1.hostname === a2.hostname &&
    a1.port === a2.port &&
    a1.protocol === a2.protocol &&
    a2.protocol !== 'file:'
  );
};

/**
 * @param {string} uri
 * @returns {string|undefined} undefined if uri is not an absolute URL
 */
const getOrigin = (uri) => {
  try {
    return new URL(uri).origin;
  } catch {
    return undefined;
  }
};

const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Throws if credentials for base would go over plain http to a host other than this machine.
 * Compares the hostname only, without a DNS lookup.
 *
 * @param {string} base
 */
const assertCredentialsTransport = (base) => {
  const { protocol, hostname, origin } = new URL(base);
  if (protocol === 'http:' && !LOOPBACK_HOSTNAMES.includes(hostname)) {
    throw new Error(
      `Refusing to send credentials to ${origin} over plain http; use https, or a loopback address for local development`
    );
  }
};

/**
 * Last 7 digits of milliseconds since 1970 + random number.
 *
 * @returns {number}
 */
const getPreventCacheNumber = () =>
  (new Date().getTime() % 10000000) * 1000 +
  Math.floor((Math.random() * 1000).toString());

/**
 * This class encapsulates functionality for communicating with the repository via Ajax calls.
 * Authentication is done via cookies and accept headers are in general set to
 * application/json behind the scenes.
 *
 * @exports module:store/Rest
 */
export default class Rest {
  constructor() {
    this.timeout = 30000; // 30 seconds
    this.JSONP = true;
    this.withCredentials = true;
    this.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=UTF-8',
    };

    const rest = this;

    if (isBrowser()) {
      /**
       *
       * @param {string} uri
       * @param {object} data
       * @param {string} format
       * @returns {Promise|undefined}
       */
      rest._putFile = (uri, data, format = 'application/json') => {
        if (!data.value) {
          return undefined;
        }

        const stubForm = new FormData();
        const { files } = data;

        Array.from(files).forEach((file, idx) => {
          // is the item a File?
          if (file instanceof File) {
            stubForm.append(idx.toString(), file);
          }
        });

        const PUTRequest = superagent.put(uri).accept(format).send(stubForm);

        if (this.withCredentials) {
          PUTRequest.withCredentials();
        }

        return PUTRequest;
      };
    }
  }

  /**
   * Set up the rate limitation for read requests.
   * The only required method of the instance is the 'enqueue' function, see it's signature in the default
   * RateLimitation class.
   *
   * @param {object} rateLimtationInstance
   * @see RateLimit#enqueue
   */
  setRateLimitationForRead(rateLimtationInstance) {
    this.readRateLimit = rateLimtationInstance;
  }

  /**
   * Set up the rate limitation for write requests.
   * The only required method of the instance is the 'enqueue' function, see it's signature in the default
   * RateLimitation class.
   *
   * @param {object} rateLimtationInstance
   * @see RateLimit#enqueue
   */
  setRateLimitationForWrite(rateLimtationInstance) {
    this.writeRateLimit = rateLimtationInstance;
  }

  /**
   * Disable JSONP for all requests, e.g. when there is a need for performance and there
   * is a need for relable caching which does not work with JSONP.
   */
  disableJSONP() {
    this.JSONP = false;
  }

  /**
   * Enable JSONP for all get requests. JSONP will only be used if EntryStore.js is running in the browser and
   * there are cross-site GET requests.
   * Note that JSONP is enabled in this scenario by default.
   */
  enableJSONP() {
    this.JSONP = true;
  }

  /**
   * Don't allow credentials, i.e. don't send cookies when doing requests.
   */
  disableCredentials() {
    this.withCredentials = false;
  }

  /**
   * Allow credentials, i.e. sending cookies, when doing requests.
   */
  enableCredentials() {
    this.withCredentials = true;
  }

  /**
   * Binds the auth cookie to the origin of base, the only origin it is sent to (Node only, in
   * the browser the cookie is handled by the browser).
   *
   * @param {string} cookie - "auth_token=<value>", cookie attributes are dropped
   * @param {string} base
   * @throws {Error} if base is plain http and not a loopback address
   * @private
   */
  _setAuthCookie(cookie, base) {
    assertCredentialsTransport(base);
    this._authCookie = cookie.split(';')[0].trim();
    this._authOrigin = new URL(base).origin;
  }

  /**
   * @private
   */
  _clearAuthCookie() {
    delete this._authCookie;
    delete this._authOrigin;
  }

  /**
   * Headers for a request to uri. The auth cookie is only included when uri has the origin it
   * is bound to; a cookie in this.headers is never sent.
   *
   * @param {string} uri
   * @returns {object}
   * @private
   */
  _headersFor(uri) {
    const headers = Object.fromEntries(
      Object.entries(this.headers).filter(
        ([name]) => name.toLowerCase() !== 'cookie'
      )
    );
    if (this._authCookie && getOrigin(uri) === this._authOrigin) {
      headers.cookie = this._authCookie;
    }
    return headers;
  }

  /**
   * @param {string} base
   * @returns {Promise<boolean>} true if the repository rejects the auth cookie or treats it as
   * guest; false if it still accepts it or cannot be asked
   * @private
   */
  async _isSessionEnded(base) {
    try {
      const userInfo = await this.get(`${base}auth/user`, null, true);
      return userInfo.user === 'guest';
    } catch (err) {
      return err.status === 401;
    }
  }

  /**
   * @param {object} credentials should contain attributes "user", "password", and "maxAge".
   * MaxAge is the amount of seconds the authorization should be valid.
   * @returns {Promise} A thenable object, in Node rejected without a request when logging in to
   * a plain http base that is not a loopback address
   * @async
   */
  async auth(credentials) {
    const {
      user,
      password,
      base,
      maxAge = 604800,
      logout = false,
    } = credentials;

    if (logout) {
      const logoutURI = `${base}auth/logout`;
      const logoutRequest = (method) => {
        const request = superagent[method](logoutURI)
          .accept('application/json')
          .withCredentials()
          .timeout({ response: this.timeout });

        Object.entries(this._headersFor(logoutURI)).map((keyVal) =>
          request.set(keyVal[0], keyVal[1])
        );

        return request;
      };
      const logoutWithFallback = async () => {
        try {
          return await logoutRequest('post');
        } catch (err) {
          // Old backends only serve logout via GET.
          if (err.status === 405 || err.status === 404) {
            return logoutRequest('get');
          }
          throw err;
        }
      };

      try {
        const response = await logoutWithFallback();
        this._clearAuthCookie();
        return response;
      } catch (err) {
        // In Node, a 401 means either that the session has already ended, or that the server
        // refused to end it, e.g. for a missing CSRF token. The token is kept in the latter case
        // so that logout can be retried.
        if (
          err.status === 401 &&
          !isBrowser() &&
          (await this._isSessionEnded(base))
        ) {
          this._clearAuthCookie();
          return err.response;
        }
        throw err;
      }
    }

    if (!isBrowser()) {
      assertCredentialsTransport(base);
    }
    this._clearAuthCookie();

    const data = {
      auth_username: encodeURIComponent(user),
      auth_password: encodeURIComponent(password),
      auth_maxage: maxAge,
    };

    if (isBrowser()) {
      return this.post(
        `${base}auth/cookie`,
        data,
        null,
        'application/x-www-form-urlencoded'
      );
    }
    const queryStringData = Object.entries(data).reduce(
      (accum, prop) => `${accum}${prop.join('=')}&`,
      ''
    );
    const authCookieResponse = await this.post(
      `${base}auth/cookie`,
      queryStringData,
      null,
      'application/x-www-form-urlencoded'
    );
    const authCookie = authCookieResponse.headers['set-cookie'].find((cookie) =>
      cookie.startsWith('auth_token=')
    );
    if (authCookie) {
      this._setAuthCookie(authCookie, base);
    }

    return authCookieResponse;
  }

  /**
   * Fetches data from the provided URI.
   * If a cross-domain call is made and we are in a browser environment a jsonp call is made.
   *
   * @param {string} uri - URI to a resource to fetch.
   * @param {string|null} format - the format to request as a mimetype.
   * @param {boolean} nonJSONP - stop JSONP handling (default false)
   * @param {object} writableStream - a writable stream to be used in nodejs e.g. for piping data directly to a file
   * @param {boolean} preventCache - if true an extra argument is added to the uri with a random number to prevent caching
   * @returns {Promise} A thenable object
   * @async
   * @throws {Error}
   */
  async get(
    uri,
    format = null,
    nonJSONP = false,
    writableStream,
    preventCache = false
  ) {
    if (this.readRateLimit) {
      return this.readRateLimit.enqueue(this._get, this, [
        uri,
        format,
        nonJSONP,
        writableStream,
        preventCache,
      ]);
    }
    return this._get(uri, format, nonJSONP, writableStream, preventCache);
  }

  /**
   * @param {string} uri
   * @param {string|null} format
   * @param {boolean} nonJSONP
   * @param {object} writableStream
   * @param {boolean} preventCache
   * @returns {Promise}
   * @private
   * @see get
   */
  async _get(uri, format, nonJSONP, writableStream, preventCache) {
    let _format = format;
    const locHeaders = this._headersFor(uri);
    locHeaders['X-Requested-With'] = null;
    delete locHeaders['Content-Type'];

    let _uri = uri;
    let handleAs = 'json';
    if (_format != null) {
      switch (_format) {
        case 'application/json': // This is the default in the headers.
          break;
        case 'xml': // backward compatible case
        case 'application/xml':
        case 'text/xml':
          _format = 'text/xml';
          handleAs = 'xml';
          break;
        case 'text': // backward compatible case
        case 'text/plain':
          _format = 'text/plain';
          handleAs = 'text';
          break;
        default: // All other situations, including text/plain.
          handleAs = 'text';
      }
      locHeaders.Accept = _format;
    }

    // Use jsonp instead of CORS for GET requests when doing cross-domain calls, it is cheaper
    if (isBrowser() && !sameOrigin(_uri) && !nonJSONP && this.JSONP) {
      return new Promise((resolve, reject) => {
        const queryParameter = new RegExp('[?&]format=');
        if (!queryParameter.test(_uri)) {
          _uri += `${_uri.includes('?') ? '&' : '?'}format=application/json`;
        }

        superagent
          .get(_uri)
          .use(
            jsonp({
              timeout: 1000000,
              // @scazan: superagent-jsonp's random number generator is weak, so we create our own
              callbackName: `cb${md5(_uri).slice(0, 7)}${getPreventCacheNumber()}`,
            })
          ) // Need this timeout to prevent a superagentCallback*** not defined issue with superagent-jsonp: https://github.com/lamp/superagent-jsonp/issues/31
          .then((data) => {
            resolve(data.body);
          }, reject);
      });
    }
    const GETRequest = superagent.get(_uri).timeout({
      response: this.timeout,
    });
    if (preventCache) {
      GETRequest.query({ preventCache: getPreventCacheNumber() });
    }
    if (this.withCredentials) {
      GETRequest.withCredentials();
    }

    if (handleAs === 'xml') {
      GETRequest.parse['text/xml'] = (res, callback) => {
        const DOMParser = isBrowser() ? window.DOMParser : xmldom.DOMParser;
        const parser = new DOMParser();

        if (isBrowser()) {
          return parser.parseFromString(res, 'application/xml');
        }

        // Node handles the return as a callback
        res.text = parser.parseFromString(res.text, 'application/xml');
        callback(null, res);

        return res.text;
      };
    }

    Object.entries(locHeaders).map((keyVal) =>
      GETRequest.set(keyVal[0], keyVal[1])
    );

    if (writableStream) {
      return new Promise((succ, err) => {
        GETRequest.pipe(writableStream);
        GETRequest.on('end', (error) => {
          if (error) {
            err(error);
          } else {
            succ();
          }
        });
      });
    }

    const response = await GETRequest;
    if (response.statusCode === 200) {
      if (handleAs === 'text' || handleAs === 'xml') {
        return response.text !== undefined
          ? response.text
          : response.body instanceof Buffer
            ? response.body.toString()
            : undefined;
      }
      return response.body;
    }
    throw new Error(`Resource could not be loaded: ${response.text}`);
  }

  /**
   * Posts data to the provided URI.
   *
   * @param {string} uri - an URI to post to.
   * @param {string | object} data - the data to post. If an object the data is sent as form data.
   * @param {Date=} modDate a date to use for the HTTP if-unmodified-since header.
   * @param {string=} format - indicates the content-type of the data, default is
   * application/json, except if the data is an object in which case the default is
   * multipart/form-data.
   * @returns {Promise} A thenable object
   */
  post(uri, data, modDate, format) {
    if (this.writeRateLimit) {
      return this.writeRateLimit.enqueue(this._post, this, [
        uri,
        data,
        modDate,
        format,
      ]);
    }
    return this._post(uri, data, modDate, format);
  }

  /**
   * @param {string} uri
   * @param {string | object} data
   * @param {Date=} modDate
   * @param {string=} format
   * @returns {Promise}
   * @private
   * @see post
   */
  _post(uri, data, modDate, format) {
    const locHeaders = this._headersFor(uri);
    if (modDate) {
      locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
    } // multipart/form-data
    if (format) {
      locHeaders['Content-Type'] = format;
    }

    const POSTRequest = superagent.post(uri);

    if (this.withCredentials) {
      POSTRequest.withCredentials();
    }

    if (data) {
      POSTRequest.send(data)
        // serialize the object into a format that the backend is used to (no JSON strings)
        .serialize((obj) =>
          Object.entries(obj)
            .map((keyVal) => `${keyVal[0]}=${keyVal[1]}&`)
            .join('')
        );
    }

    POSTRequest.timeout({ response: this.timeout });

    Object.entries(locHeaders).map((keyVal) =>
      POSTRequest.set(keyVal[0], keyVal[1])
    );

    return POSTRequest;
  }

  /**
   * Posts data to a factory resource with the intent to create a new resource.
   * That is, it posts data and expects a Location header back with information on the created
   * resource.
   *
   * @param {string} uri - factory resource, may include parameters.
   * @param {string | object} data - the data that is to be posted as a string,
   * if an object is provided it will be serialized as json.
   * @returns {Promise.<string>}
   */
  async create(uri, data) {
    const response = await this.post(uri, data);
    // let location = response.getHeader('Location');
    let { location } = response.headers;
    // In some weird cases, like when making requests from file:///
    // we do not have access to headers.
    if (!location && response.body) {
      const idx = uri.indexOf('?');
      if (idx !== -1) {
        location = uri.substring(0, uri.indexOf('?'));
      } else {
        location = uri;
      }
      location += `/entry/${JSON.parse(response.body).entryId}`;
    }

    return location;
  }

  /**
   * Replaces a resource with a new representation.
   *
   * @param {string} uri the address to put to.
   * @param {string | object} data - the data to put. If an object the data is sent as form data.
   * @param {Date=} modDate a date to use for the HTTP if-unmodified-since header.
   * @param {string=} format - indicates the content-type of the data, default is
   * application/json, except if the data is an object in which case the default is
   * multipart/form-data.
   * @returns {Promise} A thenable object
   */
  put(uri, data, modDate, format) {
    if (this.writeRateLimit) {
      return this.writeRateLimit.enqueue(this._put, this, [
        uri,
        data,
        modDate,
        format,
      ]);
    }
    return this._put(uri, data, modDate, format);
  }

  /**
   * @param {string} uri
   * @param {string | object} data
   * @param {Date=} modDate
   * @param {string=} format
   * @returns {Promise}
   * @private
   * @see put
   */
  _put(uri, data, modDate, format) {
    const locHeaders = this._headersFor(uri);
    if (modDate) {
      locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
    }
    if (format) {
      locHeaders['Content-Type'] = format;
    } else if (typeof data === 'object') {
      locHeaders['Content-Type'] = 'application/json'; // @todo perhaps not needed, this is default
    }

    const PUTRequest = superagent
      .put(uri)
      .send(data)
      .timeout({ response: this.timeout });

    if (this.withCredentials) {
      PUTRequest.withCredentials();
    }

    Object.entries(locHeaders).map((keyVal) =>
      PUTRequest.set(keyVal[0], keyVal[1])
    );

    return PUTRequest;
  }

  /**
   * Deletes a resource.
   *
   * @param {string} uri of the resource that is to be deleted.
   * @param {Date=} modDate a date to use for the HTTP if-unmodified-since header.
   * @returns {Promise} A thenable object
   */
  del(uri, modDate) {
    if (this.writeRateLimit) {
      return this.writeRateLimit.enqueue(this._del, this, [uri, modDate]);
    }
    return this._del(uri, modDate);
  }

  /**
   * @param {string} uri
   * @param {Date=} modDate
   * @returns {Promise}
   * @private
   * @see del
   */
  _del(uri, modDate) {
    const locHeaders = this._headersFor(uri);
    delete locHeaders['Content-Type'];
    if (modDate) {
      locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
    }

    const DELETERequest = superagent
      .del(uri)
      .withCredentials()
      .timeout({ response: this.timeout });

    if (this.withCredentials) {
      DELETERequest.withCredentials();
    }

    Object.entries(locHeaders).map((keyVal) =>
      DELETERequest.set(keyVal[0], keyVal[1])
    );

    return DELETERequest;
  }

  /**
   * Put a file to a URI.
   * In a browser environment a file is represented via an input tag; the files are uploaded
   * via FormData using a PUT request.
   * In node environments the file is represented as a stream constructed via
   * fs.createReadStream('file.txt').
   *
   * @param {string} uri the URI to which we will put the file.
   * @param {Node|object} data - input tag or stream that may for instance correspond to a file
   * in a nodejs setting.
   * @param {string} format the format to handle the response as, either text, xml, html or json
   * (json is default).
   * @returns {Promise} A thenable object
   */
  putFile(uri, data, format) {
    if (this.writeRateLimit) {
      return this.writeRateLimit.enqueue(this._putFile, this, [
        uri,
        data,
        format,
      ]);
    }
    return this._putFile(uri, data, format);
  }

  /**
   * @param {string} uri
   * @param {Node|object} data
   * @param {string} format
   * @returns {Promise}
   * @private
   * @see putFile
   */
  _putFile(uri, data, format) {
    if (data && data.constructor && data.constructor.pipeline) {
      return new Promise((resolve, reject) => {
        const upload = superagent.put(uri).timeout({ response: this.timeout });
        const locHeaders = this._headersFor(uri);
        if (format) {
          locHeaders['Content-Type'] = format;
        }
        Object.entries(locHeaders).map((keyVal) =>
          upload.set(keyVal[0], keyVal[1])
        );

        const req = upload.request();
        data.constructor.pipeline(data, req, (err) => {
          if (err) {
            upload.abort();
            return reject(err);
          }

          upload.end((err2, res) => {
            if (err2) return reject(err2);
            return resolve(res);
          });
        });
      });
    }
    return Promise.reject(
      new Error('Data parameter must be a readable stream')
    );
  }
}
