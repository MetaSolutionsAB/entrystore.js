  import { Resource } from './Resource';

  /**
   * User instances are resources corresponding to users that can be authenticated to access
   * the EntryStore repository. The user resource URI can be referred to from access control lists.
   *
   * @exports store/User
   */
  class User extends Resource {
    /**
     * @param {string} entryURI - URI to an entry where this resource is contained.
     * @param {string} resourceURI - URI to the resource.
     * @param {store/EntryStore} entryStore - the API's repository instance.
     * @param {Object} data - information about the user, e.g. object with name and homecontext.
     */
    constructor(entryURI, resourceURI, entryStore, data) {
      super(entryURI, resourceURI, entryStore);
      this._data = data;
    }

    /**
     * Get the name of the user, this is a a unique name (username) in the current repository's
     * _principals context.
     * @returns {string}
     */
    getName() {
      return this._data.name;
    }

    /**
     * Set a new name (username), it will not succeed if it is already in use, for instance by
     * another user or group.
     * @param {string} name
     * @returns {xhrPromise}
     */
    setName(name) {
      const oldname = this._data.name;
      this._data.name = name;
      const es = this._entryStore;
      return es.handleAsync(es.getREST().put(this._resourceURI, JSON.stringify({ name }))
        .then((data) => {
          const e = this.getEntry(true);
          if (e) {
            e.getEntryInfo()._name = data;
          }
          return data;
        }, (e) => {
          this._data.name = oldname;
          throw e;
        }), 'setUserName');
    }

    /**
     * Get the preferred language of the user.
     * @returns {string}
     */
    getLanguage() {
      return this._data.language;
    }

    /**
     * Sets the preferred language of a user.
     * @param {string} language
     * @returns {xhrPromise}
     */
    setLanguage(language) {
      const oldlanguage = this._data.language;
      this._data.language = language;
      const es = this._entryStore;
      return es.handleAsync(es.getREST().put(this._resourceURI, JSON.stringify({ language }))
        .then(data => data, (e) => {
          this._data.language = oldlanguage;
          throw e;
        }), 'setUserLanguage');
    }

    /**
     * Set a new password for the user.
     *
     * @param {string} password - a new password, should be at least 8 characters long.
     * @returns {xhrPromise}
     */
    setPassword(password) {
      const es = this._entryStore;
      return es.handleAsync(es.getREST().put(this._resourceURI,
        JSON.stringify({ password })), 'setUserPassword');
    }

    /**
     * Get the home context for this user.
     *
     * @returns {string} - a context id (not the full resource URI).
     */
    getHomeContext() {
      return this._data.homecontext;
    }

    /**
     * Set a new home context for this user.
     *
     * @param {string} contextId - a context id (not the full resource URI).
     * @returns {xhrPromise}
     */
    setHomeContext(contextId) {
      const oldhc = this._data.homecontext;
      this._data.homecontext = contextId;
      const es = this._entryStore;
      return es.handleAsync(es.getREST().put(this._resourceURI,
        JSON.stringify({ homecontext: contextId }))
        .then(data => data, (e) => {
          this._data.homecontext = oldhc;
          throw e;
        }), 'setUserHomeContext');
    }

    /**
     * Get custom properties.
     *
     * @returns {object} - key value pairs of custom properties.
     */
    getCustomProperties() {
      return this._data.customProperties || {};
    }

    /**
     * Set a new home context for this user.
     *
     * @param {string} contextId - a context id (not the full resource URI).
     * @returns {xhrPromise}
     */
    setCustomProperties(customProperties) {
      const oldcp = this._data.customProperties;
      this._data.customProperties = customProperties;
      const es = this._entryStore;
      return es.handleAsync(es.getREST().put(this._resourceURI,
        JSON.stringify({ customProperties }))
        .then(data => data, (e) => {
          this._data.customProperties = oldcp;
          throw e;
        }), 'setUserCustomProperties');
    }

    getSource() {
      return this._data;
    }
  };

  export { User };
