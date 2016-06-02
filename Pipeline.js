/*global define*/
define([
    "dojo/_base/array",
    "dojo/json",
    "./terms",
    "./Graph"
], function(array, json, terms, Graph) {

	/**
     * Pipeline is a Graph that contains an ordered list of transforms, each transform is of a specific type
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


    /**
     * The destination where the result (in the form of a single RDF graph) should
     * end up (within the specified entry's graph resource).
     * If empty string, a new entry will be created to store the results.
     * If undefined, the result will not go to a single destination, see getDetectDestination instead.
     * Some transform types does not respect the destination, e.g. currently ROWSTORE which
     * always creates a new entry containing the results.
     *
     * @returns {String|undefined} an entry URI where the result should go, empty string for new entries for every execution or undefined if no destination has been specified.
     */
    Pipeline.prototype.getDestination = function() {
        return this._graph.findFirstValue(null, terms.pipeline.transformDestination);
    };

    /**
     * @see store/Pipeline#getDestination
     * @param {String} entryOrEntryURI entry URI, empty string for new entries every time, use undefined to remove destination setting altogether.
     */
    Pipeline.prototype.setDestination = function(entryOrEntryURI) {
        this._graph.findAndRemove(null, terms.pipeline.transformDestination);
        var uri = typeof entryOrEntryURI === "object" && entryOrEntryURI.getURI ? entryOrEntryURI.getURI() : entryOrEntryURI;
        this._graph.add(this._resourceURI, terms.pipeline.transformDestination, uri);
    };

    /**
     * Detect destination means that the result of the last transform (a graph) should be attempted
     * to be split into multiple entries according to markings in the graph.
     *
     * I.e. it detects and adds a set of entries from the graph via the anonymous closure algorithm starting from blank nodes resources
     * with either one of the two following properties that both indicate which entryId to use:<ul>
     * <li>http://entrystore.org/terms/mergeResourceId or the</li>
     * <li>http://entrystore.org/terms/referenceResourceId</li>
     * </ul>
     * The mergeResourceId indicates that the corresponding entry should be merged or created if it does not exist.
     * The referenceResourceId only indicates that another entry (via its resource id) should be referenced from
     * the graph (which might be inside an entry indicated by mergeResourceId).
     *
     *
     * @returns {boolean} true if destination should be detected.
     */
    Pipeline.prototype.getDetectDestination = function() {
        var val = this._graph.findFirstValue(null, terms.pipeline.transformDetectDestination);
        if (typeof val !== "undefined") {
            return val.toLowerCase().indexOf("true") === 0;
        }
        return false;
    };

    /**
     *
     * @see store/Pipeline#getDetectDestination
     * @param {boolean} detect if true detection of entry references in the graph is attempted.
     */
    Pipeline.prototype.setDetectDestination = function(detect) {
        this._graph.findAndRemove(null, terms.pipeline.transformDetectDestination);
        if (detect === true) {
            this._graph.add(this._resourceURI, terms.pipeline.transformDetectDestination, {
                type: "literal", value: "true", datatype: terms.xsd.boolean
            });
        }
    };

    /**
     * @returns {String[]} of transform ids, typically blank node ids, hence, they are not preserved between saves / loads so take care.
     */
    Pipeline.prototype.getTransforms = function() {
        var stmts = this._graph.find(null, terms.pipeline.transform);
        var arr = array.map(stmts, function(stmt) {
            return stmt.getValue();
        });
        var self = this;
        arr.sort(function(tr1, tr2) {
            var pr1 = self.getPriority(tr1);
            var pr2 = self.getPriority(tr2);
            return pr1-pr2;
        });
        return arr;
    };

    /**
     * Adds a new transform.
     *
     * @param {String} type one of the [getTransforms]{@link store/Pipeline#getTransforms}.
     * @param {Object} args a hash of key value pairs for this transform.
     * @returns {String} the newly transforms id (for this session, may change after save / load so take care).
     */
    Pipeline.prototype.addTransform = function(type, args) {
        var transforms = this.getTransforms();
        var priority = transforms.length > 0 ? this.getPriority(transforms[transforms.length-1]) : 0;
        var stmt = this._graph.add(this._resourceURI, terms.pipeline.transform);
        var id = stmt.getValue();
        this.setTransformType(id, type);
        this.setTransformArguments(id, args);
        return id;
    };

    /**
     * Removes a transform.
     *
     * @param {String} transformId the blank node of a specific transform as retrieved by [getTransforms]{@link store/Pipeline#getTransforms}.
     * @see store/Pipeline#getTransforms
     */
    Pipeline.prototype.removeTransform = function(transformId) {
        this.setTransformArguments(transformId, {});
        this._graph.findAndRemove(transformId);
        this._graph.findAndRemove(null, null, {type: "bnode", value: transformId});
    };

    /**
     * Changes the order of the transforms by changing their priority properties.
     *
     * @param {String} transformId the blank node of a specific transform as retrieved by [getTransforms]{@link store/Pipeline#getTransforms}.
     * @see store/Pipeline#getTransforms
     */
    Pipeline.prototype.setOrderOfTransforms = function(transforms) {
        for (var i=0;i<transforms.length;i++) {
            this._graph.findAndRemove(transforms[i], terms.pipeline.transformPriority);
            this._graph.add(transforms[i], terms.pipeline.transformPriority, {
                type: "literal", value: ""+i, datatype: terms.xsd.integer})
        }
    };

    /**
     * @param {String} transformId the blank node of a specific transform as retrieved by [getTransforms]{@link store/Pipeline#getTransforms}.
     * @returns {float} the priority as a float.
     */
    Pipeline.prototype.getPriority = function(transformId) {
        var prio = this._graph.findFirstValue(transformId, terms.pipeline.transformPriority);
        if (typeof prio === "string") {
            prio = parseFloat(prio);
            if (!isNaN(prio)) {
                return prio;
            }
        }
        return 0;
    };

    /**
     * It is recommended to use setOrderOfTransforms instead.
     * @param {String} transformId the blank node of a specific transform as retrieved by [getTransforms]{@link store/Pipeline#getTransforms}.
     * @returns {float} the priority as a float.
     * @see store/Pipeline#setOrderOfTransforms
     */
    Pipeline.prototype.setPriority = function(transformId, prio) {
        this._graph.findAndRemove(transformId, terms.pipeline.transformPriority);
        this._graph.add(transformId, terms.pipeline.transformPriority, {
            type: "literal", value: ""+prio, datatype: terms.xsd.integer});
    };

    /**
     * Available transforms (types).
     *
     * @type {{TABULAR: string, ROWSTORE: string}}
     */
    Pipeline.prototype.transformTypes = {
        TABULAR: "tabular",
        ROWSTORE: "rowstore",
        QUEUE: "queue",
        FETCH: "fetch",
        VALIDATE: "validate",
        MERGE: "merge"
    };

    /**
     * @param {String} transformId the blank node of a specific transform as retrieved by [getTransforms]{@link store/Pipeline#getTransforms}.
     * @returns {String} one of the values specified in {@link store/Pipeline#transformTypes}.
     */
    Pipeline.prototype.getTransformType = function(transformId) {
        return this._graph.findFirstValue(transformId, terms.pipeline.transformType);
    };

    /**
     *
     * @param {String} transformId the blank node of a specific transform as retrieved by [getTransforms]{@link store/Pipeline#getTransforms}.
     * @param {String} transformType one of the options in {@link store/Pipeline#transformTypes}.
     */
    Pipeline.prototype.setTransformType = function(transformId, transformType) {
        this._graph.findAndRemove(transformId, terms.pipeline.transformType);
        this._graph.addL(transformId, terms.pipeline.transformType, transformType);
    };


    /**
     * @param {String} transformId the blank node of a specific transform as retrieved
     * by [getTransforms]{@link store/Pipeline#getTransforms}.  If no id is provided
     * arguments from all transforms will be returned in a single merged object.
     * @returns {Object} the arguments for a transform (or all transforms) as an object
     * hash with property value pairs.
     */
    Pipeline.prototype.getTransformArguments = function(transformId) {
        var args = {};
        var stmts = this._graph.find(transformId, terms.pipeline.transformArgument);
        array.forEach(stmts, function(stmt) {
            var key = this._graph.findFirstValue(stmt.getValue(), terms.pipeline.transformArgumentKey);
            var value = this._graph.findFirstValue(stmt.getValue(), terms.pipeline.transformArgumentValue);
            args[key] = value;
        }, this);
        return args;
    };

    /**
     * Replaces the current arguments with those provided.
     * @param {String} transformId the blank node of a specific transform as retrieved by [getTransforms]{@link store/Pipeline#getTransforms}.
     * @param {Object} the arguments for the transform as an object hash with property value pairs.
     */
    Pipeline.prototype.setTransformArguments = function(transformId, args) {
        var stmts = this._graph.find(transformId, terms.pipeline.transformArgument);
        array.forEach(stmts, function(stmt) {
            this._graph.findAndRemove(stmt.getValue(), terms.pipeline.transformArgumentKey);
            this._graph.findAndRemove(stmt.getValue(), terms.pipeline.transformArgumentValue);
            this._graph.remove(stmt);
        }, this);
        for (var key in args) if (args.hasOwnProperty(key)) {
            var newarg = this._graph.add(transformId, terms.pipeline.transformArgument);
            this._graph.addL(newarg.getValue(), terms.pipeline.transformArgumentKey,key);
            this._graph.addL(newarg.getValue(), terms.pipeline.transformArgumentValue, args[key]);
        }
    };

    /**
     * Executes the pipeline with the given source entry as input, if not provided the pipeline will be used as sourceentry.
     *
     * @param {store/Entry} sourceEntry an optional entry containing some data that is to be transformed, e.g. can be a CSV file.
     * @returns {entryURIArrayPromise} an array of entry URIs that where created/modified by this execution.
     */
    Pipeline.prototype.execute = function(sourceEntry) {
        var executeURI, source,
            es = this.getEntryStore();
        if (sourceEntry == null) {
            source = this.getEntryURI();
            executeURI = es.getBaseURI() + es.getContextId(source) + "/execute";
        } else {
            source = sourceEntry.getURI()
            executeURI = sourceEntry.getContext().getResourceURI()+"/execute";
        }
        return es.handleAsync(es.getREST().post(executeURI, json.stringify({
            pipeline: this.getEntryURI(),
            source: source
        })), "execute");
    };

    return Pipeline;
});

/**
 * Promise that provides an array of entry URIs on success.
 *
 * @name entryURIArrayPromise
 * @extends dojo/promise/Promise
 * @class
 */
/**
 * @name entryURIArrayPromise#then
 * @param {entryURIArrayCallback} onSuccess
 * @param {xhrFailureCallback} onError
 */
/**
 * @callback entryURIArrayCallback
 * @param {string[]} entryURIArray
 */