import Resource from './Resource.js';

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
   * @param {EntryStore} entryStore - the API's repository instance.
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
  async setName(name) {
    const es = this.getEntryStore();
    const entry = await this.getEntry();
    const oldName = this._data.name;
    this._data.name = name;
    const promise = es.getREST().put(this._resourceURI, JSON.stringify({ name }));
    es.handleAsync(promise, 'setUserName');
    try {
      const response = await promise;
      entry.getEntryInfo()._name = name;
      entry.getEntryInfo().setModificationDate(response.header['last-modified']);
      return response;
    } catch (err) {
      this._data.name = oldName;
      throw e;
    }
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
  async setLanguage(language) {
    const es = this.getEntryStore();
    const entry = await this.getEntry();
    const oldLang = this._data.language;
    this._data.language = language;
    const promise = es.getREST().put(this._resourceURI, JSON.stringify({ language }));
    es.handleAsync(promise, 'setUserLanguage');
    try {
      const response = await promise;
      entry.getEntryInfo().setModificationDate(response.header['last-modified']);
      return response;
    } catch (err) {
      this._data.language = oldLang;
      throw e;
    }
  }

  /**
   * Set a new password for the user.
   *
   * @param {string} newPassword - a new password, should be at least 8 characters long.
   * @param {string|undefined} currentPassword - the current password, may be required depending on EntryStore configuration.
   * @returns {Promise}
   */
  async setPassword(newPassword, currentPassword) {
    const es = this.getEntryStore();
    const entry = await this.getEntry();
    const obj = { password: newPassword };
    if (currentPassword) {
      obj.currentPassword = currentPassword;
    }
    const promise = es.getREST().put(this._resourceURI, JSON.stringify(obj));
    es.handleAsync(promise, 'setUserPassword');
    const response = await promise;
    entry.getEntryInfo().setModificationDate(response.header['last-modified']);
    return response;
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
  async setDisabled(disabled) {
    if (disabled === this.isDisabled()) {
      return true;
    }
    const es = this.getEntryStore();
    const entry = await this.getEntry();
    const oldDisabled = this._data.disabled === true;
    this._data.disabled = disabled;
    const promise = es.getREST().put(this._resourceURI, JSON.stringify({ disabled }))
    es.handleAsync(promise, 'setUserDisabled');
    try {
      const response = await promise;
      entry.getEntryInfo()._disabled = disabled;
      entry.getEntryInfo().setModificationDate(response.header['last-modified']);
      return response;
    } catch (err) {
      this._data.disabled = oldDisabled;
      throw e;
    }
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
  async setHomeContext(contextId) {
    const es = this.getEntryStore();
    const entry = await this.getEntry();
    const oldHomeContext = this._data.homecontext;
    this._data.homecontext = contextId;
    const promise = es.getREST().put(this._resourceURI, JSON.stringify({ homecontext: contextId }));
    es.handleAsync(promise, 'setUserHomeContext');
    try {
      const response = await promise;
      entry.getEntryInfo().setModificationDate(response.header['last-modified']);
      return response;
    } catch (err) {
      this._data.homecontext = oldHomeContext;
      throw e;
    }
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
  async setCustomProperties(customProperties) {
    const es = this.getEntryStore();
    const entry = await this.getEntry();
    const oldCustomProperties = this._data.customProperties;
    // Make a copy of the custom properties to make sure we only send strings as values.
    const cp = {};
    Object.keys(customProperties).forEach(key => (cp[key] = `${customProperties[key]}`));
    this._data.customProperties = cp;
    const promise = this._entryStore.getREST().put(this._resourceURI, JSON.stringify({ customProperties: cp }));
    es.handleAsync(promise, 'setUserCustomProperties');
    try {
      const response = await promise;
      entry.getEntryInfo().setModificationDate(response.header['last-modified']);
      return response;
    } catch (err) {
      this._data.customProperties = oldCustomProperties;
      throw e;
    }
  }

  /**
   *
   * @return {Object}
   */
  getSource() {
    return this._data;
  }
}
