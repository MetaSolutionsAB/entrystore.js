/*global define*/
define([
    "dojo/json",
    "store/Resource",
	"rdfjson/Graph"
], function(json, Resource, Graph) {
	
	/**
     * @param {store.EntryStore} entryStore
     * @param {String} entryURI
	 * @param {String} resourceURI
     * @param {rdfjson.Graph | Object} data is a RDF graph of some sort
	 * @constructor
     * @extends store.Resource
	 */
	var RDFGraph = function(entryURI, resourceURI, entryStore, data) {
        Resource.apply(this, arguments); //Call the super constructor.
        this._graph = data instanceof Graph? data : new Graph(data);
	};

    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    RDFGraph.prototype = new F();

    RDFGraph.prototype.getGraph = function() {
		return this._graph;
	};
	
	//TODO fix ifModifiedSince.
	RDFGraph.prototype.setGraph = function(graph) {
		this._graph = graph || this._graph;
		return this._entryStore.getREST().put(this._resourceURI, json.stringify(graph.exportRDFJSON()));
	};

    RDFGraph.prototype.getSource = function() {
        return this._graph.exportRDFJSON();
    };

    RDFGraph.prototype._update = function(data) {
        this._graph = new Graph(data);
    };

	return RDFGraph;
});