/*global define*/
define([
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/json",
	"./rest",
	"./terms",
	"./factory",
	"rdfjson/Graph"
], function(array, Deferred, json, rest, terms, factory, Graph) {
	
	/**
	 * @param {String} entryURI must be provided unless the graph contains a statement with the store:resource property which allows us to infer the entryURI.
	 * @param {rdfjson.Graph} graph corresponds to a rdfjson.Graph class with the entryinfo as statements
     * @param {store.EntryStore} entryStore
	 * @class
	 */
	var EntryInfo = function(entryURI, graph, entryStore) {
		this._entryURI = entryURI || graph.find(null, terms.resource)[0].getSubject();
		this._graph = graph || new Graph();
		this._entryStore = entryStore;
	};

    /**
     * @returns {store.Entry}
     */
	EntryInfo.prototype.getEntry = function() {
		return this._entry;
	};

    /**
     * @param {rdfjson.Graph} graph
     */
	EntryInfo.prototype.setGraph = function(graph) {
		this._graph = graph;
	};

    /**
     * @return {rdfjson.Graph}
     */
	EntryInfo.prototype.getGraph = function() {
		return this._graph;
	};

    /**
     * Saves the entry information, e.g. posts to basepath/store/{contextId}/entry/{entryId}
     * @returns {dojo.promise.Promise}
     */
	EntryInfo.prototype.save = function() {
		var d = new Deferred(), self = this;
		this._entry.getEntryStore.getREST().put(this.getEntryURI(), json.stringify(this._info.exportRDFJSON())).then(function() {
			self._entry.setRefreshNeeded(true);
			self._entry.refresh().then(function() {
				d.resolve(self);
			}, function() {
				//Failed refreshing, but succeded at saving metadata, at least send out message that it needs to be refreshed.
				self._entry.getEntryStore().getCache().message("refreshed", self);
				d.resolve(self);
			});
		}, function(err) {
			d.reject("Failed saving entryinfo. "+err);
		});
		return d.promise;
	};

    /**
     * @returns {String}
     */
	EntryInfo.prototype.getEntryURI = function() {
		return this._entryURI;
	};
    /**
     * @returns {String} the id of the entry
     */
    EntryInfo.prototype.getId = function() {
        return factory.getId(this._entryURI);
    };

    /**
     * @returns {String}
     */
	EntryInfo.prototype.getMetadataURI = function() {
		return factory.getMetadataURI(this._entryURI);
	};

    /**
     * @returns {String}
     */
	EntryInfo.prototype.getExternalMetadataURI = function() {
		return this._graph.findFirstValue(this._entryURI, terms.externalMetadata); //TODO will only exist for LinkReferences and References.
	};

    /**
     * @param {String} uri
     */
	EntryInfo.prototype.setExternalMetadataURI = function(uri) {
		this._graph.findAndRemove(this._entryURI, terms.externalMetadata);
		this._graph.create(this._entryURI, terms.externalMetadata, {type: "uri", value: uri});
	};

    /**
     * @returns {String}
     */
    EntryInfo.prototype.getCachedExternalMetadataURI = function() {
		return factory.getCachedExternalMetadataURI(this._entryURI);
	};

    /**
     * @returns {String}
     */
    EntryInfo.prototype.getResourceURI = function() {
		return this._graph.findFirstValue(this._entryURI, terms.resource);		
	};

    /**
     * @param {String} uri
     */
    EntryInfo.prototype.setResourceURI = function(uri) {
		var oldResourceURI = this.getResourceURI();
		this._graph.findAndRemove(this._entryURI, terms.resource);
		this._graph.create(this._entryURI, terms.resource, {type: "uri", value: uri});
		var stmts = this._graph.find(oldResourceURI);
		for (var i=0;i<stmts.length;i++) {
			stmts[i].setSubject(uri);
		}
	};

    /**
     * @returns {String} one of the entryTypes
     * @see store.terms#entryType
     */
    EntryInfo.prototype.getEntryType = function() {
		var et = this._graph.findFirstValue(this._entryURI, terms.rdf.type);
		return terms.entryType[et || "default"];
	};

	EntryInfo.prototype.getResourceType = function() {
		return this._getResourceType(terms.resourceType);
	};

	EntryInfo.prototype.getGraphType = function() {
		return this._getResourceType(terms.graphType);
	};

	EntryInfo.prototype._getResourceType = function(vocab) {
		var stmts = this._graph.find(this.getResourceURI(), terms.rdf.type);
		for (var i=0;i<stmts.length;i++) {
			var t = vocab[stmts[i].getValue()];
			if (t != null) {
				return t;
			}
		}
		return vocab["default"];
	};
	
	//TODO: change to entryURI instead of resourceURI for principalURIs.
	/**
	 * The acl object returned looks like:
	 * {
	 *		admin:  [principalURI1, principalURI2, ...],
	 *		rread:  [principalURI3, ...],
	 *		rwrite: [principalURI4, ...],
	 *		mread:  [principalURI5, ...],
	 *		mwrite: [principalURI6, ...]
	 * }
	 * 
	 * There will always be an array for each key, it might be empty though.
	 * The principalURI must be the URI to the resource of a user or group entry.
	 * 
	 * Please note that a non empty acl overrides any defaults from the surrounding context.
	 * 
	 * @return {Object} an acl object.
	 */
	EntryInfo.prototype.getACL = function() {
		var f = function(stmt) { return stmt.getValue();};  //Statement > object value.
		var ru = this.getResourceURI(), mu = this.getMetadataURI();
		return {
			admin:	array.map(this._graph.find(this._entryURI, terms.write), f),
			rread:	array.map(this._graph.find(ru, terms.read), f),
			rwrite:	array.map(this._graph.find(ru, terms.write), f),
			mread:	array.map(this._graph.find(mu, terms.read), f),
			mwrite:	array.map(this._graph.find(mu, terms.write), f)
		};
	};
	
	/**
	 * Replaces the current acl with the provided acl. The acl object is the same as you get from the getACL call.
	 * The only difference is that the acl object from this method is allowed to be empty 
	 * or leave out some keys that are not to be set.
	 * 
	 * @param acl {Object} same kind of object you get from getACL.
	 */
	EntryInfo.prototype.setACL = function(acl) {
		var f = function(subj, pred, principals) {
			this._graph.findAndRemove(subj, pred);
			array.forEach(principals || [], function(principal) {
				this._graph.create(subj, pred, {type: "uri", value: principal});
			}, this);
		};
		acl = acl || {};
		var ru = this.getResourceURI(), mu = this.getMetadataURI();
		f(this._entryURI, terms.write, acl.admin);
		f(ru, terms.read, acl.rread);
		f(ru, terms.write, acl.rread);
		f(mu, terms.read, acl.mread);
		f(mu, terms.write, acl.mread);
	};
	
	return EntryInfo;
});