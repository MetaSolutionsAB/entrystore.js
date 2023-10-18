import List from './List.js';
import terms from './terms.js';

/**
 * Group is a subclass of the List resource and contains a list of users.
 * The group resource URI can be referred to from access control lists.
 *
 * @exports store/Group
 */
export default class Group extends List {
  /**
   * @param {string} entryURI - URI to an entry where this resource is contained.
   * @param {string} resourceURI - URI to the resource.
   * @param {EntryStore} entryStore - the API's repository instance.
   */
  constructor(entryURI, resourceURI, entryStore) {
    super(entryURI, resourceURI, entryStore);
  }

  /**
   * Get the name of the group, this is a a unique name (username) in the current
   * repository's _principals context.
   * @returns {string}
   */
  getName() {
    return this._name;
  }

  /**
   * Set a new name of the group, it will not succeed if it is already in use, for instance by
   * another user or group.
   * @param {string} name
   * @returns {Promise<Group>}
   */
  async setName(name) {
    const es = this._entry.getEntryStore();
    const entry = await this.getEntry();
    const entryInfo = entry.getEntryInfo();

    const oldName = this._name;
    this._name = name;
    entryInfo._name = name;
    try {
      const promise = es.getREST().put(
        `${this.getEntryURI()}/name`, JSON.stringify({ name }));
      es.handleAsync(promise, 'setGroupName');
      const response = await promise;
      entryInfo.setModificationDate(response.header['last-modified']);
    } catch(e) {
      this._name = oldName;
      entryInfo._name = oldName;
      throw e;
    }
    return this;
  }

  /**
   * Get the home context for this user.
   *
   * @returns {string} - a context id (not the full resource URI).
   */
  getHomeContext() {
    const es = this.getEntryStore();
    const entry = this.getEntry(true);
    const contextResourceURI = entry.getEntryInfo().getGraph().findFirstValue(
      entry.getResourceURI(), terms.homeContext);
    if (contextResourceURI != null) {
      return es.getEntryId(contextResourceURI);
    }
    return undefined;
  }

  /**
   * Set a new home context for this group.
   * Note that the home context is stored in the entryinformation, hence, all other changes made
   * to the entryinformation will be saved unless the doNotPushToRepository flag is set to true.
   *
   * @param {string} contextId - a context id (not the full resource URI).
   * @param {boolean} doNotPushToRepository if true the changes will be made in the
   * entryinformation but it will not be pushed to the respository. To do this you need to get
   * a hold of the entryinformation and call commit.
   * @returns {Promise.<EntryInfo>|undefined}
   */
  async setHomeContext(contextId, doNotPushToRepository) {
    const entry = await this.getEntry();
    const es = this.getEntryStore();
    const newContextURI = es.getResourceURI('_contexts', contextId);

    const graph = entry.getEntryInfo().getGraph();
    graph.findAndRemove(entry.getResourceURI(), terms.homeContext);
    graph.add(entry.getResourceURI(), terms.homeContext, { type: 'uri', value: newContextURI });
    if (doNotPushToRepository !== true) {
      return entry.getEntryInfo().commit();
    }
    return undefined;
  }

  /**
   *
   * Data contains allUnsorted array, size, and children.
   * @param data
   * @param children
   * @private
   */
  _update(data, children) {
    super._update(data, children);
    this._name = data.name;
  }
}
