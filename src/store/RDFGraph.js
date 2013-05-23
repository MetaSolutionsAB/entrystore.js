/*global define*/
define([
	"dojo/_base/lang",
	"dojo/Deferred",
    "./Resource",
	"rdfjson/Graph"
], function(lang, Deferred, Resource, Graph) {
	
	/**
     * @param {store.EntryStore} entryStore
     * @param {String} entryURI
	 * @param {String} resourceURI
	 * @constructor
     * @extends store.Resource
	 */
	var RDFGraph = function(entryURI, resourceURI, entryStore) {
        Resource.apply(this, arguments); //Call the super constructor.
	};

    RDFGraph.prototype.getGraph = function() {
		if (this._graph) {
			var d = new Deferred();
			d.resolve(this._graph);
			return d.promise;
		} else {
			return this._entryStore.getREST().get(this._resourceURI).then(lang.hitch(this, function(data) {
				this._graph = new Graph(data);
				return this._graph;
			}));
		}
	};
	
	//TODO fix ifModifiedSince.
	RDFGraph.prototype.setGraph = function(graph) {
		this._graph = graph;
		return this._entryStore.getREST().put(this._resourceURI, graph.exportRDFJSON());
	};

	return RDFGraph;
});