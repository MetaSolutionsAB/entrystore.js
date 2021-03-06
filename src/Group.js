import List from './List';
import terms from './terms';

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
   * @returns {Promise}
   */
  setName(name) {
    const oldName = this._name;
    this._name = name;
    return this._entryStore.handleAsync(this._entryStore.getREST().put(
      `${this.getEntryURI()}/name`, JSON.stringify({ name }))
      .then((data) => {
        const entry = this.getEntry(true);
        if (entry) {
          entry.getEntryInfo()._name = data;
        }
        return data;
      }, (e) => {
        this._name = oldName;
        throw e;
      }), 'setGroupName');
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
  setHomeContext(contextId, doNotPushToRepository) {
    const es = this.getEntryStore();
    const newContextURI = es.getResourceURI('_contexts', contextId);
    const entry = this.getEntry(true);
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
