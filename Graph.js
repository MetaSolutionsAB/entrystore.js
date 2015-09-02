/*global define*/
define([
    "dojo/json",
    "store/Resource",
	"rdfjson/Graph"
], function(json, Resource, Graph) {
	
	/**
     * Graph is a resource for handling RDF graphs relying on the {@link rdfjson/Graph} API.
     *
     * @exports store/Graph
     * @param {string} entryURI - URI to an entry where this resource is contained.
     * @param {string} resourceURI - URI to the resource.
     * @param {store/EntryStore} entryStore - the API's repository instance.
     * @param {rdfjson/Graph | Object} data - is an RDF graph of some sort
	 * @class
     * @augments store/Resource
	 */
	var GraphResource = function(entryURI, resourceURI, entryStore, data) {
        Resource.apply(this, arguments); //Call the super constructor.
        this._graph = data instanceof Graph? data : new Graph(data);
	};

    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    GraphResource.prototype = new F();

    /**
     * Get the rdf Graph. The returned graph is not a copy, subsequent getGraph calls will return the same instance
     * as long as the entry has not been refreshed or a new instance set via {@link store/Graph#setGraph setGraph}.
     *
     * @returns {rdfjson/Graph} will never be null or undefined, although the graph may be empty.
     */
    GraphResource.prototype.getGraph = function() {
		return this._graph;
	};

    /**
     * Set the rdf Graph. To update the graph in the repository call the {@link store/EntryStore#commit commit}.
     *
     * @param {rdfjson/Graph} graph - the new graph, if null or undefined a new empty graph will be set.
     * @returns store/Graph - to allow chaining with commit.
     */
    GraphResource.prototype.setGraph = function(graph) {
        this._graph = graph || new Graph();
        return this;
    };
    /**
     * Pushes the current graph back to repository.
     *
     * @todo fix ifModifiedSince.
     * @param {rdfjson/Graph} graph
     * @returns {xhrPromise}
     */
    GraphResource.prototype.commit = function() {
        return this._entryStore.getREST().put(this._resourceURI, json.stringify(this._graph.exportRDFJSON()));
    };

    /**
     * Provides a JSON representation of the graph as rdf/json.
     *
     * @returns {Object}
     */
    GraphResource.prototype.getSource = function() {
        return this._graph.exportRDFJSON();
    };

    GraphResource.prototype._update = function(data) {
        this._graph = new Graph(data);
    };

	return GraphResource;
});