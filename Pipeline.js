/*global define*/
define([
    "dojo/_base/array",
    "./terms",
    "./Graph"
], function(array, terms, Graph) {

	/**
     * Pipeline is a Graph that contains a list of transforms, each transform is of a specific type
     * and takes a set of arguments.
     *
     * @exports store/Pipeline
     * @param {string} entryURI - URI to an entry where this resource is contained.
     * @param {string} resourceURI - URI to the resource.
     * @param {store/EntryStore} entryStore - the API's repository instance.
     * @param {rdfjson/Graph | Object} data - is an RDF graph of some sort
	 * @constructor
     * @extends store/Resource
	 */
	var Pipeline = function(entryURI, resourceURI, entryStore, data) {
        Graph.apply(this, arguments); //Call the super constructor.
	};
    //Inheritance trick
    var F = function() {};
    F.prototype = Graph.prototype;
    Pipeline.prototype = new F();


    //transformDestination
    Pipeline.prototype.getDestination = function() {
        return this._graph.findFirstValue(null, terms.pipeline.transformDestination);
    };

    Pipeline.prototype.setDestination = function(entryOrEntryURI) {
        this._graph.findAndRemove(null, terms.pipeline.transformDestination);
        var uri = typeof entryOrEntryURI === "object" && entryOrEntryURI.getURI ? entryOrEntryURI.getURI() : entryOrEntryURI;
        this._graph.add(this._resourceURI, terms.pipeline.transformDestination, uri);
    };

    Pipeline.prototype.getDetectDestination = function() {
        var val = this._graph.findFirstValue(null, terms.pipeline.transformDetectDestination);
        if (typeof val !== "undefined") {
            return val.toLowerCase().indexOf("true") === 0;
        }
        return false;
    };

    Pipeline.prototype.setDetectDestination = function(detect) {
        this._graph.findAndRemove(null, terms.pipeline.transformDetectDestination);
        if (detect === true) {
            this._graph.add(this._resourceURI, terms.pipeline.transformDetectDestination, {
                type: "literal", value: "true", datatype: terms.xsd.boolean
            });
        }
    };

    Pipeline.prototype.getTransforms = function() {
        var stmts = this._graph.find(null, terms.pipeline.transform);
        var arr = array.map(stmts, function(stmt) {
            return stmt.getValue();
        });
        arr.sort(function(tr1, tr2) {
            var pr1 = this.getPriority(tr1);
            var pr2 = this.getPriority(tr2);
            return tr1-tr2;
        });
        return arr;
    };

    Pipeline.prototype.addTransform = function(type, args) {
        var transforms = this.getTransforms();
        var priority = transforms.length = 0 ? this.getPriority(transforms[transforms.length-1]) : 0;
        var stmt = this._graph.add(this._resourceURI, terms.pipeline.transform);
        var id = stmt.getValue();
        this.setTransformType(id, type);
        this.setTransformArguments(id, args);
        return id;
    };

    Pipeline.prototype.removeTransform = function(transform) {
        this.setTransformArguments(transform, {});
        this._graph.findAndRemove(transform);
        this._graph.findAndRemove(null, null, {type: "bnode", value: transform});
    };

    Pipeline.prototype.setOrderOfTransforms = function(transforms) {
        for (var i=0;i<transforms.length;i++) {
            this._graph.findAndRemove(transforms[i], terms.pipeline.transformPriority);
            this._graph.add(transforms[i], terms.pipeline.transformPriority, {
                type: "literal", value: ""+i, datatype: terms.xsd.integer})
        }
    };
    Pipeline.prototype.getPriority = function(transform) {
        var prio = this._graph.findFirstValue(transform, terms.pipeline.transformPriority);
        if (typeof prio === "string") {
            prio = parseFloat(prio);
            if (!isNaN(prio)) {
                return prio;
            }
        }
        return 0;
    };

    Pipeline.prototype.transformTypes = {
        TABULAR: "tabular",
        ROWSTORE: "rowstore"
    };

    Pipeline.prototype.getTransformType = function(transform) {
        return this._graph.findFirstValue(transform, terms.pipeline.transformType);
    };

    Pipeline.prototype.setTransformType = function(transform, transformType) {
        this._graph.findAndRemove(transform, terms.pipeline.transformType);
        this._graph.add(transform, terms.pipeline.transformType, {
            type: "literal", value: transformType})
    };

    Pipeline.prototype.getTransformArguments = function(transform) {
        var args = {};
        var stmts = this._graph.find(transform, terms.pipeline.transformArgument);
        array.forEach(stmts, function(stmt) {
            var key = this._graph.findFirstValue(stmt.getValue(), terms.pipeline.transformArgumentKey);
            var value = this._graph.findFirstValue(stmt.getValue(), terms.pipeline.transformArgumentValue);
            args[key] = value;
        }, this);
        return args;
    };

    Pipeline.prototype.setTransformArguments = function(transform, args) {
        var stmts = this._graph.find(transform, terms.pipeline.transformArgument);
        array.forEach(stmts, function(stmt) {
            this._graph.findAndRemove(stmt.getValue(), terms.pipeline.transformArgumentKey);
            this._graph.findAndRemove(stmt.getValue(), terms.pipeline.transformArgumentValue);
            this._graph.remove(stmt);
        }, this);
        for (var key in args) if (args.hasOwnProperty(key)) {
            var newarg = this._graph.add(transform, terms.pipeline.transformArgument);
            this._graph.add(newarg.getValue(), terms.pipeline.transformArgumentKey,
                {type: "literal", value: key});
            this._graph.add(newarg.getValue(), terms.pipeline.transformArgumentValue,
                {type: "literal", value: args[key]});
        }
        return args;
    };

    return Pipeline;
});