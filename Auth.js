define([], () => {
  let _listenerCounter = 0;

  /**
   * EntryStore is the main class that is used to connect to a running server-side
   * EntryStore repository.
   * @exports store/Auth
   * @param {store/EntryStore} entrystore - a repository instance.
   * @class
   */
  return class {
    constructor(entrystore) {
      this.entrystore = entrystore;
      this._listenerCounter = 0;
      this._listenersIdx = {};
    }

    messageListeners(topic, obj) {
      Object.keys(this._listenersIdx).forEach((alid) => {
        this._listenersIdx[alid](topic, obj);
      });
    }

    /**
     * Adds an authentification listener, it will be notified of login and logout events.
     * @param {authListener} listener
     */
    addAuthListener(listener) {
      if (listener.__alid == null) {
        listener.__alid = `idx_${_listenerCounter}`;
        _listenerCounter += 1;
      }
      this._listenersIdx[listener.__alid] = listener;
    }

    /**
     * Removes an authentification listener.
     * @param {authListener} listener
     */
    removeAuthListener(listener) {
      if (listener.__alid != null) {
        delete this._listenersIdx[listener.__alid];
      }
    }

    /**
     * Yields information about who currently is authenticated against the EntryStore repository.
     * @returns {userInfoPromise} - upon success an object containing attributes "user" being
     * the username, "id" of the user entry,
     * and "homecontext" being the entry-id of the home context is provided.
     * @see {@link store/EntryStore#auth auth}
     * @see {@link store/EntryStore#logout logout}
     */
    getUserInfo(forceLookup) {
      if (this.userInfo && forceLookup !== true) {
        return new Promise(resolve => resolve(this.userInfo));
      }
      if (!this._uiDef) {
        const self = this;
        delete this.userInfo;
        this._uiDef = this.entrystore._rest.get(`${this.entrystore._baseURI}auth/user`, null, true).then((userinfo) => {
          self.userInfo = userinfo;
          delete self._uiDef;
          return userinfo;
        });
        this.entrystore.handleAsync(this._uiDef, 'getUserInfo');
      }
      return this._uiDef;
    }

    /**
     * @returns {entryPromise} on success the entry for the currently signed in user is provided.
     */
    getUserEntry(forceLookup) {
      if (this.userEntry && forceLookup !== true) {
        return new Promise(resolve => resolve(this.userEntry));
      }
      if (!this._ueDef) {
        const self = this;
        delete this.userEntry;
        this._ueDef = this.getUserInfo(forceLookup)
          .then(data => self.entrystore.getEntry(self.entrystore.getEntryURI('_principals', data.id), { asyncContext: 'getUserEntry' }))
          .then((userEntry) => {
            self.userEntry = userEntry;
            delete self._ueDef;
            return userEntry;
          });
      }
      return this._ueDef;
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
    login(user, password, maxAge) {
      if (this.userInfo && this.userInfo.user === user) {
        return this.getUserInfo();
      }
      const self = this;
      const credentials = {
        base: this.entrystore.getBaseURI(),
        user,
        password,
        maxAge,
      };
      return this.entrystore.handleAsync(this.entrystore.getREST().auth(credentials)
        .then((data) => {
          if (typeof data === 'object' && data.user) {
            return data;
          }
          return self.entrystore._rest.get(`${self.entrystore._baseURI}auth/user`, null, true);
        })
        .then((data) => {
          if (self._uiDef) {
            self._uiDef.cancel();
          }
          if (self._ueDef) {
            self._ueDef.cancel();
          }
          self.userInfo = data;
          delete self.userEntry;
          self.entrystore.getCache().allNeedRefresh();
          self.messageListeners('login', data);
          return data;
        }), 'login');
    }

    /**
     * Logout the currently authorized user.
     * @returns {xhrPromise}
     */
    logout() {
      if (this.userInfo && this.userInfo.user === 'guest') {
        return this.getUserInfo();
      }
      const credentials = { base: this.entrystore.getBaseURI(), logout: true };
      const self = this;
      return this.entrystore.handleAsync(this.entrystore.getREST().auth(credentials).then(() => {
        self.userInfo = { user: 'guest', id: '_guest' };
        delete self.userEntry;
        self.entrystore.getCache().allNeedRefresh();
        self.messageListeners('logout', self.userInfo);
        return self.userInfo;
      }), 'logout');
    }
  };
});

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
