import md5 from 'blueimp-md5';
import superagent from 'superagent';
import xmldom from '@xmldom/xmldom';
import { isBrowser } from './utils';
import jsonp from 'superagent-jsonp';

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

  return a1.hostname === a2.hostname
    && a1.port === a2.port
    && a1.protocol === a2.protocol
    && a2.protocol !== 'file:';
};

/**
 * @return {number}
 */
const getPreventCacheNumber = () => parseInt((Math.random() * 10000).toString(), 10);

/**
 * This class encapsulates functionality for communicating with the repository via Ajax calls.
 * Authentication is done via cookies and accept headers are in general set to
 * application/json behind the scenes.
 *
 * @exports store/Rest
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
       * @param uri
       * @param {Object} data
       * @param format
       * @return {undefined|*}
       */
      rest.putFile = (uri, data, format = 'application/json') => {
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

        const POSTRequest = superagent.post(uri)
          .accept(format)
          .send(stubForm);

        if (this.withCredentials) {
          POSTRequest.withCredentials();
        }

        return POSTRequest;
      };
    }
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
   * @param {object} credentials should contain attributes "user", "password", and "maxAge".
   * MaxAge is the amount of seconds the authorization should be valid.
   * @return {Promise} A thenable object
   * @async
   */
  async auth(credentials) {
    const { user, password, base, maxAge = 604800, logout = false } = credentials;
    delete this.headers.cookie;

    if (logout) {
      const logoutRequestResult = superagent.get(`${base}auth/logout`)
        .accept('application/json')
        .withCredentials()
        .timeout({ response: this.timeout });

      Object.entries(this.headers).map(keyVal => logoutRequestResult.set(keyVal[0], keyVal[1]));

      return logoutRequestResult;
    }

    const data = {
      auth_username: encodeURIComponent(user),
      auth_password: encodeURIComponent(password),
      auth_maxage: maxAge,
    };

    if (isBrowser()) {
      return this.post(`${base}auth/cookie`, data, null, 'application/x-www-form-urlencoded');
    }
    const queryStringData = Object.entries(data).reduce((accum, prop) => `${accum}${prop.join('=')}&`, '');
    const authCookieResponse = await this.post(`${base}auth/cookie`, queryStringData, null, 'application/x-www-form-urlencoded');
    const cookies = authCookieResponse.headers['set-cookie'];

    for (const cookie of cookies) {
      if (cookie.startsWith('auth_token=')) {
        this.headers.cookie = [cookie];
        break;
      }
    }

    return authCookieResponse;
  }

  /**
   * Fetches data from the provided URI.
   * If a cross-domain call is made and we are in a browser environment a jsonp call is made.
   *
   * @param {string} uri - URI to a resource to fetch.
   * @param {string|null} _format - the format to request as a mimetype.
   * @param {boolean} nonJSONP - stop JSONP handling (default false)
   * @param {stream} writableStream - a writable stream to be used in nodejs e.g. for piping data directly to a file
   * @return {Promise} A thenable object
   * @async
   * @throws Error
   */
  async get(uri, format = null, nonJSONP = false, writableStream) {
    let _format = format;
    const locHeaders = Object.assign({}, this.headers);
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

        superagent.get(_uri)
          .use(
            jsonp({
              timeout: 1000000,
              // @scazan: superagent-jsonp's random number generator is weak, so we create our own
              callbackName: `cb${md5(_uri).slice(0, 7)}${getPreventCacheNumber()}`,
            }),
          ) // Need this timeout to prevent a superagentCallback*** not defined issue with superagent-jsonp: https://github.com/lamp/superagent-jsonp/issues/31
          .then((data) => {
            resolve(data.body);
          }, reject);
      });
    }
    const GETRequest = superagent.get(_uri)
      .timeout({
        response: this.timeout,
      });
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
        // @todo @valentino check if here it should be an else and callback outside that

        // Node handles the return as a callback
        res.text = parser.parseFromString(res.text, 'application/xml');
        callback(null, res);

        return res.text;
      };
    }

    Object.entries(locHeaders).map(keyVal => GETRequest.set(keyVal[0], keyVal[1]));

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
        // eslint-disable-next-line no-nested-ternary
        return response.text !== undefined ? response.text
          : (response.body instanceof Buffer ? response.toString() : undefined);
      }
      return response.body;
    }
    throw new Error(`Resource could not be loaded: ${response.text}`);
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
   * @return {Promise} A thenable object
   */
  post(uri, data, modDate, format) {
    const locHeaders = Object.assign({}, this.headers);
    if (modDate) {
      locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
    }// multipart/form-data
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
        .serialize(obj => Object.entries(obj)
          .map(keyVal => `${keyVal[0]}=${keyVal[1]}&`)
          .join(''));
    }

    POSTRequest.timeout({ response: this.timeout });

    Object.entries(locHeaders).map(keyVal => POSTRequest.set(keyVal[0], keyVal[1]));

    return POSTRequest;
  }

  /**
   * Posts data to a factory resource with the intent to create a new resource.
   * That is, it posts data and expects a Location header back with information on the created
   * resource.
   *
   * @param {string} uri - factory resource, may include parameters.
   * @param {string|Object} data - the data that is to be posted as a string,
   * if an object is provided it will be serialized as json.
   * @returns {Promise.<String>}
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
        location = uri.substr(0, uri.indexOf('?'));
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
   * @param {string|Object} data - the data to put. If an object the data is sent as form data.
   * @param {Date=} modDate a date to use for the HTTP if-unmodified-since header.
   * @param {string=} format - indicates the content-type of the data, default is
   * application/json, except if the data is an object in which case the default is
   * multipart/form-data.
   * @return {Promise} A thenable object
   */
  put(uri, data, modDate, format) {
    const locHeaders = Object.assign({}, this.headers);
    if (modDate) {
      locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
    }
    if (format) {
      locHeaders['Content-Type'] = format;
    } else if (typeof data === 'object') {
      locHeaders['Content-Type'] = 'application/json'; // @todo perhaps not needed, this is default
    }

    const PUTRequest = superagent.put(uri)
      .send(data)
      .timeout({ response: this.timeout });

    if (this.withCredentials) {
      PUTRequest.withCredentials();
    }

    Object.entries(locHeaders).map(keyVal => PUTRequest.set(keyVal[0], keyVal[1]));

    return PUTRequest;
  }

  /**
   * Deletes a resource.
   *
   * @param {String} uri of the resource that is to be deleted.
   * @param {Date=} modDate a date to use for the HTTP if-unmodified-since header.
   * @return {Promise} A thenable object
   */
  del(uri, modDate) {
    const locHeaders = Object.assign({}, this.headers);
    delete locHeaders['Content-Type'];
    if (modDate) {
      locHeaders['If-Unmodified-Since'] = modDate.toUTCString();
    }

    const DELETERequest = superagent.del(uri)
      .withCredentials()
      .timeout({ response: this.timeout });

    if (this.withCredentials) {
      DELETERequest.withCredentials();
    }

    Object.entries(locHeaders).map(keyVal => DELETERequest.set(keyVal[0], keyVal[1]));

    return DELETERequest;
  }

  /**
   * Put a file to a URI.
   * In a browser environment a file is represented via an input tag which references
   * the file to be uploaded via its value attribute.
   * In node environments the file is represented as a stream constructed via
   * fs.createReadStream('file.txt').
   *
   * _**Under the hood** the tag is moved into a form in an invisible iframe
   * which then is submitted. If there is a response it is provided in a textarea which
   * can be looked into since we are on the same domain._
   *
   * @param {string} uri the URI to which we will put the file.
   * @param {data} data - input tag or stream that may for instance correspond to a file
   * in a nodejs setting.
   * @param {string} format the format to handle the response as, either text, xml, html or json
   * (json is default).
   * @return {Promise} A thenable object
   */
  putFile(uri, data, format) {
    if (data && data.constructor && data.constructor.pipeline) {
      return new Promise((resolve, reject) => {
        const upload = superagent.put(uri)
          .timeout({ response: this.timeout });
        const locHeaders = Object.assign({}, this.headers);
        if (format) {
          locHeaders['Content-Type'] = format;
        }
        Object.entries(locHeaders).map(keyVal => upload.set(keyVal[0], keyVal[1]));

        const req = upload.request();
        data.constructor.pipeline(data, req, (err) => {
          if (err) {
            upload.abort();
            return reject(err);
          }

          upload.end((err2, res) => {
            if (err2) return reject(err2);
            return resolve(res.body);
          });
        });
      });
    }
    return Promise.reject(new Error('Data parameter must be a readable stream'));
  }
}
