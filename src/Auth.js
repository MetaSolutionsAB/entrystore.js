/**
 * EntryStore is the main class that is used to connect to a running server-side
 * EntryStore repository.
 * @exports store/Auth
 */
export default class {
  /**
   * @param {store/EntryStore} entrystore - a repository instance.
   */
  constructor(entrystore) {
    this.entrystore = entrystore;
    this._listenerCounter = 0;

    /**
     * @type {Map<string, Function>}
     * @private
     */
    this._listenersIdx = new Map();
  }

  messageListeners(topic, obj) {
    this._listenersIdx.forEach((func) => {
      func(topic, obj);
    });
  }

  /**
   * Adds an authentification listener, it will be notified of login and logout events.
   * @param {authListener} listener
   */
  addAuthListener(listener) {
    if (listener.__alid == null) {
      listener.__alid = `idx_${this._listenerCounter}`;
      this._listenerCounter += 1;
    }
    this._listenersIdx.set(listener.__alid, listener);
  }

  /**
   * Removes an authentification listener.
   * @param {authListener} listener
   */
  removeAuthListener(listener) {
    if (listener.__alid != null) {
      this._listenersIdx.delete(listener.__alid);
    }
  }

  /**
   * Yields information about who currently is authenticated against the EntryStore repository.
   * @returns {Promise.<store/EntryInfo>} - upon success an object containing attributes "user" being
   * the username, "id" of the user entry,
   * and "homecontext" being the entry-id of the home context is provided.
   * @see {@link store/EntryStore#auth auth}
   * @see {@link store/EntryStore#logout logout}
   */
  async getUserInfo(forceLookup = false) {
    if (this.userInfo && !forceLookup) {
      return Promise.resolve(this.userInfo);
    }
    if (!this._uiDef) {
      this._uiDef = this.entrystore.getREST().get(`${this.entrystore._baseURI}auth/user`, null, true);
      this.entrystore.handleAsync(this._uiDef, 'getUserInfo');
      this.userInfo = await this._uiDef;
      delete this._uiDef;
    }

    return this._uiDef;
  }

  /**
   * @returns {Promise.<store/Entry>} on success the entry for the currently signed in user is provided.
   */
  async getUserEntry(forceLookup = false) {
    if (this.userEntry && !forceLookup) {
      return Promise.resolve(this.userEntry);
    }

    if (!this._ueDef) {
      this._ueDef = this.getUserInfo(forceLookup);
      const userInfo = await this._ueDef;
      this.userEntry = await this.entrystore.getEntry(this.entrystore.getEntryURI('_principals', userInfo.id), {
        asyncContext: 'getUserEntry',
      });
    }
    return this.userEntry;
  }

  /**
   * Authenticate using credentials containing a user, a password and an optional maxAge
   * given in seconds.
   *
   * @param user
   * @param password
   * @param maxAge
   * @returns {xhrPromise}
   */
  async login(user, password, maxAge) {
    if (this.userInfo && this.userInfo.user === user) {
      return this.getUserInfo();
    }

    const credentials = {
      base: this.entrystore.getBaseURI(),
      user,
      password,
      maxAge,
    };

    const authPromise = this.entrystore.getREST().auth(credentials);
    this.entrystore.handleAsync(authPromise, 'login');
    const auth = await authPromise;
    if (typeof auth === 'object' && auth.user) {
      return auth;
    }
    const userInfo = await this.entrystore.getREST().get(`${this.entrystore._baseURI}auth/user`, null, true);

    if (this._uiDef) {
      this._uiDef.cancel();
    }
    if (this._ueDef) {
      this._ueDef.cancel();
    }

    this.userInfo = userInfo;
    delete this.userEntry;
    this.entrystore.getCache().allNeedRefresh();
    this.messageListeners('login', userInfo);

    return userInfo;
  }

  /**
   * Logout the currently authorized user.
   * @returns {Promise}
   */
  logout() {
    if (this.userInfo && this.userInfo.user === 'guest') {
      return this.getUserInfo();
    }

    const credentials = {
      base: this.entrystore.getBaseURI(),
      logout: true,
    };

    const logoutPromise = this.entrystore.getREST().auth(credentials);
    this.entrystore.handleAsync(logoutPromise, 'logout');

    this.userInfo = { user: 'guest', id: '_guest' };
    delete this.userEntry;
    this.entrystore.getCache().allNeedRefresh();
    this.messageListeners('logout', this.userInfo);

    return this.userInfo;
  }
}

/**
 * @name userInfoPromise
 * @extends xhrPromise
 * @class
 */
/**
 * @name userInfoPromise#then
 * @param {userInfoCallback} onSuccess
 * @param {xhrFailureCallback} onError
 */
/**
 * @callback userInfoCallback
 * @param {userInfo} resource
 */
/**
 * @name userInfo
 * @namespace
 * @property {string}  user                   - the username
 * @property {string}  id                     - the entry id of the users entry
 * @property {string}  homecontext            - the entry id of the users home context.
 */

/**
 * @callback authListener
 * @param {string} topic - either login or logout.
 * @param {userInfo} userInfo - an object with the current user information
 */
