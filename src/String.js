import Resource from './Resource.js';

/**
 * String is a resource for handling simple strings of data.
 *
 * @exports store/String
 */
export default class StringResource extends Resource {
  /**
   * @param {string} entryURI - URI to an entry where this resource is contained.
   * @param {string} resourceURI - URI to the resource.
   * @param {EntryStore} entryStore - the API's repository instance.
   * @param {string} data - the actual string, may the empty string, but not null or undefined.
   */
  constructor(entryURI, resourceURI, entryStore, data) {
    super(entryURI, resourceURI, entryStore); // Call the super constructor.
    this._data = data;
  }

  /**
   * @returns {string} may be an empty string, never null or undefined.
   */
  getString() {
    return this._data;
  }

  /**
   * Set a new string, does not save it to the repository, use commit for that. E.g.
   *
   *     stringresource.setString("New value").commit().then(function() {...});
   *
   * @param {string} string - the new string
   * @returns {StringResource} allows chaining with commit.
   * @see String#commit
   */
  setString(string) {
    this._data = string || '';
    return this;
  }

  /**
   * Pushes the string back to the repository.
   *
   * @returns {Promise}
   * @see String#setString
   */
  async commit() {
    const es = this.getEntryStore();
    const entry = await this.getEntry();
    const promise = es.getREST().put(this._resourceURI, this._data);
    es.handleAsync(promise, 'commitString');
    const response = await promise;
    entry.getEntryInfo().setModificationDate(response.header['last-modified']);
    return response;
  }

  getSource() {
    return this._data;
  }
}
