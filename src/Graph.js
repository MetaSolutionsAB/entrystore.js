import { Graph } from '@entryscape/rdfjson';
import Resource from './Resource.js';

/**
 * Graph is a resource for handling RDF graphs relying on the {@link rdfjson/Graph} API.
 *
 * @exports store/Graph
 */
export default class GraphResource extends Resource {
  /**
   * @param {string} entryURI - URI to an entry where this resource is contained.
   * @param {string} resourceURI - URI to the resource.
   * @param {EntryStore} entryStore - the API's repository instance.
   * @param {rdfjson/Graph | Object} data - is an RDF graph of some sort
   */
  constructor(entryURI, resourceURI, entryStore, data) {
    super(entryURI, resourceURI, entryStore); // Call the super constructor.
    this._graph = data && data._graph ? data : new Graph(data);
  }

  /**
   * Get the rdf Graph. The returned graph is not a copy, subsequent getGraph calls will return
   * the same instance as long as the entry has not been refreshed or a new instance set via
   * {@link Graph#setGraph setGraph}.
   *
   * @returns {rdfjson/Graph} will never be null or undefined, although the graph may be empty.
   */
  getGraph() {
    return this._graph;
  }

  /**
   * Set the rdf Graph. To update the graph in the repository call the
   * {@link EntryStore#commit commit}.
   *
   * @param {rdfjson/Graph} graph - the new graph, if null or undefined a new empty graph will
   * be set.
   * @returns {Graph} - to allow chaining with commit.
   */
  setGraph(graph) {
    this._graph = graph || new Graph();
    return this;
  }

  /**
   * Pushes the current graph back to repository.
   *
   * @param {boolean} ignoreIfUnmodifiedSinceCheck no if-unmodified header is sent if true, default is false.
   * @returns {Promise<GraphResource>}
   */
  async commit(ignoreIfUnmodifiedSinceCheck = false) {
    const es = this.getEntryStore();
    const entry = await this.getEntry();
    const entryInfo = entry.getEntryInfo();

    const promise = es.getREST().put(this._resourceURI,
      JSON.stringify(this._graph.exportRDFJSON()),
      ignoreIfUnmodifiedSinceCheck ? undefined : entryInfo.getModificationDate());
    es.handleAsync(promise, 'commitGraph');
    const response = await promise;
    entryInfo.setModificationDate(response.header['last-modified']);
    return this;
  }

  /**
   * Provides a JSON representation of the graph as rdf/json.
   *
   * @returns {Object}
   */
  getSource() {
    return this._graph.exportRDFJSON();
  }

  /**
   *
   * @param data
   * @private
   */
  _update(data) {
    this._graph = new Graph(data);
  }
}
