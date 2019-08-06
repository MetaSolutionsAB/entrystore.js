import Resource from './Resource';

/**
 * User instances are resources corresponding to users that can be authenticated to access
 * the EntryStore repository. The user resource URI can be referred to from access control lists.
 *
 * @exports store/User
 */
export default class User extends Resource {
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
   * @returns {Promise}
   */
  setName(name) {
    const oldName = this._data.name;
    this._data.name = name;
    return this._entryStore.handleAsync(es.getREST().put(this._resourceURI, JSON.stringify({ name }))
      .then((data) => {
        const entry = this.getEntry(true);
        if (entry) {
          entry.getEntryInfo()._name = name;
        }
        return data;
      }, (e) => {
        this._data.name = oldName;
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
   * @returns {Promise}
   */
  setLanguage(language) {
    const oldLang = this._data.language;
    this._data.language = language;
    return this._entryStore.handleAsync(this._entryStore.getREST().put(this._resourceURI, JSON.stringify({ language }))
      .then(data => data, (e) => {
        this._data.language = oldLang;
        throw e;
      }), 'setUserLanguage');
  }

  /**
   * Set a new password for the user.
   *
   * @param {string} password - a new password, should be at least 8 characters long.
   * @returns {Promise}
   */
  setPassword(password) {
    return this._entryStore.handleAsync(this._entryStore.getREST().put(this._resourceURI,
      JSON.stringify({ password })), 'setUserPassword');
  }

  /**
   * Check if the user is disabled. Disabled users cannot sign in, although they still exist
   * for lookup, e.g. when presenting creators and contributors.
   * @returns {boolean}
   */
  isDisabled() {
    return this._data.disabled === true;
  }

  /**
   * Set the user to be disabled or not.
   * @param {boolean} disabled
   * @returns {Promise}
   */
  setDisabled(disabled) {
    if (disabled === this.isDisabled()) {
      return Promise.resolve(true);
    }
    const oldDisabled = this._data.disabled === true;
    this._data.disabled = disabled;
    return this._entryStore.handleAsync(this._entryStore.getREST().put(this._resourceURI,
      JSON.stringify({ disabled }))
      .then((data) => {
        const entry = this.getEntry(true);
        if (entry) {
          entry.getEntryInfo()._disabled = disabled;
        }
        return data;
      }, (e) => {
        this._data.disabled = oldDisabled;
        throw e;
      }), 'setUserDisabled');
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
   * @returns {Promise}
   */
  setHomeContext(contextId) {
    const oldHomeContext = this._data.homecontext;
    this._data.homecontext = contextId;
    return this._entryStore.handleAsync(this._entryStore.getREST().put(this._resourceURI,
      JSON.stringify({ homecontext: contextId }))
      .then(data => data, (e) => {
        this._data.homecontext = oldHomeContext;
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
   * @param {object} customProperties
   * @returns {Promise}
   */
  setCustomProperties(customProperties) {
    const oldCustomProperties = this._data.customProperties;
    this._data.customProperties = customProperties;
    return this._entryStore.handleAsync(this._entryStore.getREST().put(this._resourceURI,
      JSON.stringify({ customProperties }))
      .then(data => data, (e) => {
        this._data.customProperties = oldCustomProperties;
        throw e;
      }), 'setUserCustomProperties');
  }

  /**
   *
   * @return {Object}
   */
  getSource() {
    return this._data;
  }
}
