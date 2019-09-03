import factory from './factory';
/**
 * This is the base class for resources contained by entries, do not use directly,
 * instead use a subclass.
 *
 * @exports store/Resource
 * @see subclass {@link Context}
 * @see subclass {@link List}
 * @see subclass {@link Graph}
 * @see subclass {@link String}
 * @see subclass {@link File}
 * @see subclass {@link User}
 * @see subclass {@link Group}
 */
export default class Resource {
  /**
   * @param {string} entryURI - URI to an entry where this resource is contained.
   * @param {string} resourceURI - URI to the resource.
   * @param {EntryStore} entryStore - the API's repository instance.
   */
  constructor(entryURI, resourceURI, entryStore) {
    this._entryURI = entryURI;
    this._resourceURI = resourceURI;
    this._entryStore = entryStore;
  }

  /**
   * Retrieves the API's repository instance
   *
   * @returns {EntryStore}
   */
  getEntryStore() {
    return this._entryStore;
  }

  /**
   * Retrieves the entry that contains this resource. Asking for the entry directly
   * (direct=true, rather than getting
   * it asynchronously via a promise) should work for all resources except context resources.
   *
   * > _**Advanced explanation:**
   * > Context resources are often created opportunistically by the API without also
   * > loading the context entry along with it, e.g. when loading entries during a search
   * > operation. The reason why the context entries are not loaded along with the context
   * > resource is that such an approach, depending on the use-case, may lead to dramatic
   * > increases in the amount of requests to the repository._
   *
   * @return {Promise.<Entry>|Entry} if direct=true an Entry is returned (or undefined if not
   * in cache, only happens sometimes for Contexts) otherwise a promise is returned that on
   * success provides the entry for this resource.
   */
  getEntry(direct = false) {
    return this._entryStore.getEntry(this._entryURI, { direct });
  }

  /**
   * The resources own URI.
   *
   * @returns {string}
   */
  getResourceURI() {
    return this._resourceURI;
  }

  /**
   * The URI to the entry containing this resource.
   *
   * @returns {string}
   */
  getEntryURI() {
    return this._entryURI;
  }

  /**
   * The id for the entry containing this resource.
   *
   * @returns {string}
   */
  getId() {
    return factory.getEntryId(this._entryURI);
  }

  _update(data) {
    this._data = data;
  }

  getSource() {
    return this._data;
  }
}
