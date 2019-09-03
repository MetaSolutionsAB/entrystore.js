/**
 * EntryStore is the main class that is used to connect to a running server-side
 * EntryStore repository.
 * @exports store/Auth
 */
export default class Auth {
  /**
   * @param {EntryStore} entrystore - a repository instance.
   */
  constructor(entrystore) {
    this._entryStore = entrystore;
    this._listenerCounter = 0;

    /**
     * @type {Map<string, Function>}
     * @private
     */
    this._listeners = new Map();
  }

  /**
   *
   * @param {String} topic
   * @param obj
   */
  messageListeners(topic, obj) {
    this._listeners.forEach(func => func(topic, obj));
  }

  /**
   * Adds an authentication listener, it will be notified of login and logout events.
   * @param {Function} listener
   */
  addAuthListener(listener) {
    if (listener.__alid == null) {
      listener.__alid = `idx_${this._listenerCounter}`;
      this._listenerCounter += 1;
    }
    this._listeners.set(listener.__alid, listener);
  }

  /**
   * Removes an authentication listener
   * @param {Function} listener
   */
  removeAuthListener(listener) {
    if (listener.__alid != null) {
      this._listeners.delete(listener.__alid);
    }
  }

  /**
   * Yields information about who currently is authenticated against the EntryStore repository.
   * @returns {Promise.<EntryInfo>} - upon success an object containing attributes "user" being
   * the username, "id" of the user entry,
   * and "homecontext" being the entry-id of the home context is provided.
   * @see {@link EntryStore#auth auth}
   * @see {@link EntryStore#logout logout}
   */
  async getUserInfo(forceLookup = false) {
    if (this.userInfo && !forceLookup) {
      return Promise.resolve(this.userInfo);
    }

    this.userInfo = await this._entryStore.handleAsync(
      this._entryStore.getREST().get(`${this._entryStore._baseURI}auth/user`, null, true), 'getUserInfo');

    return this.userInfo;
  }

  /**
   * @returns {Promise.<Entry>} on success the entry for the currently signed in user is provided.
   */
  async getUserEntry(forceLookup = false) {
    if (this.userEntry && !forceLookup) {
      return Promise.resolve(this.userEntry);
    }

    const userInfo = await this.getUserInfo(forceLookup);
    this.userEntry = await this._entryStore.getEntry(this._entryStore.getEntryURI('_principals', userInfo.id), {
      asyncContext: 'getUserEntry',
    });

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
      return this.getUserInfo();
    }
    const credentials = {
      base: this._entryStore.getBaseURI(),
      user,
      password,
      maxAge,
    };

    const auth = await this._entryStore.handleAsync(this._entryStore.getREST().auth(credentials), 'login');
    if (typeof auth === 'object' && auth.user) {
      return auth;
    }
    this.userInfo = await this._entryStore.getREST().get(`${this._entryStore._baseURI}auth/user`, null, true);

    delete this.userEntry;
    this._entryStore.getCache().allNeedRefresh();

    this.messageListeners('login', this.userInfo);

    return this.userInfo;
  }

  /**
   * Logout the currently authorized user.
   * @returns {Promise.<{user, id}>} The guest user info
   */
  async logout() {
    if (this.userInfo && this.userInfo.user === 'guest') {
      return this.getUserInfo();
    }

    // handleAsync returns the original promise passed
    await this._entryStore.handleAsync(this._entryStore.getREST().auth({
      base: this._entryStore.getBaseURI(),
      logout: true,
    }), 'logout');

    delete this.userEntry;
    this._entryStore.getCache().allNeedRefresh();

    this.userInfo = { user: 'guest', id: '_guest' };
    this.messageListeners('logout', this.userInfo);

    return this.userInfo;
  }
}
