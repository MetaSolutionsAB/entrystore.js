/**
 * EntryStore is the main class that is used to connect to a running server-side
 * EntryStore repository.
 * @exports store/Auth
 */
export default class Auth {
  /**
   * @param {store/EntryStore} entrystore - a repository instance.
   */
  constructor(entrystore) {
    this._entryStore = entrystore;
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
      this._uiDef = this._entryStore.getREST().get(`${this._entryStore._baseURI}auth/user`, null, true);
      this._entryStore.handleAsync(this._uiDef, 'getUserInfo');
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
      this.userEntry = await this._entryStore.getEntry(this._entryStore.getEntryURI('_principals', userInfo.id), {
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
   * @returns {Promise}
   */
  async login(user, password, maxAge) {
    if (this.userInfo && this.userInfo.user === user) {
      console.log('yeeessss!');
      return this.getUserInfo();
    }
    console.log(user, password);
    const credentials = {
      base: this._entryStore.getBaseURI(),
      user,
      password,
      maxAge,
    };

    const authPromise = this._entryStore.getREST().auth(credentials);
    console.log(authPromise);
    this._entryStore.handleAsync(authPromise, 'login');
    const auth = await authPromise;
    if (typeof auth === 'object' && auth.user) {
      return auth;
    }
    const userInfo = await this._entryStore.getREST().get(`${this._entryStore._baseURI}auth/user`, null, true);
    console.log(userInfo);

    if (this._uiDef) {
      this._uiDef.cancel();
    }
    if (this._ueDef) {
      this._ueDef.cancel();
    }

    this.userInfo = userInfo;
    delete this.userEntry;
    this._entryStore.getCache().allNeedRefresh();
    this.messageListeners('login', userInfo);

    return userInfo;
  }

  /**
   * Logout the currently authorized user.
   * @returns {Promise}
   */
  logout() {
    if (this.userInfo && this.userInfo.user === 'guest') {
      console.log('test');
      const test = this.getUserInfo();
      console.log(test);
      return this.getUserInfo();
    }

    const credentials = {
      base: this._entryStore.getBaseURI(),
      logout: true,
    };

    const logoutPromise = this._entryStore.getREST().auth(credentials);
    this._entryStore.handleAsync(logoutPromise, 'logout');

    this.userInfo = { user: 'guest', id: '_guest' };
    delete this.userEntry;
    this._entryStore.getCache().allNeedRefresh();
    this.messageListeners('logout', this.userInfo);

    return this.userInfo;
  }
}
