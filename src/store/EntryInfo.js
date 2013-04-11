/*global define*/
define([
	"dojo/_base/array",
	"./rest",
	"./terms",
	"rdfjson/Graph"
], function(array, rest, terms, Graph) {
	
	/**
	 * @param entryURI must be provided unless the graph contains a statement with the store:resource property which allows us to infer the entryURI.
	 * @param graph corresponds to a rdfjson.Graph class with the entryinfo as statements.
	 * @constructor
	 */
	var EntryInfo = function(entryURI, graph) {
		this.entryURI = entryURI || graph.find(null, terms.resource)[0].getSubject();
		this.graph = graph || new Graph();
	};
	var ei = EntryInfo.prototype; //Shortcut, avoids having to write EntryInfo.prototype below when defining methods.

	ei.setGraph = function(graph) {
		this.graph = graph;
	};
	
	ei.getGraph = function(graph) {
		return this.graph;
	};
	
	ei.getEntryURI = function() {
		return this.entryURI;
	};
	
	ei.getMetadataURI = function() {
		return this.graph.findFirstValue(this.entryURI, terms.metadata); //TODO will not exist for references.
	};
	
	ei._setMetadataURI = function(uri) {
	};
	
	ei.getExternalMetadataURI = function() {
		return this.graph.findFirstValue(this.entryURI, terms.externalMetadata); //TODO will only exist for LinkReferences and References.
	};

	ei.setExternalMetadataURI = function(uri) {
		this.graph.findAndRemove(this.entryURI, terms.externalMetadata);
		this.graph.create(this.entryURI, terms.externalMetadata, {type: "uri", value: uri});
	};
	
	ei.getResourceURI = function() {
		return this.graph.findFirstValue(this.entryURI, terms.resource);		
	};
	
	ei.setResourceURI = function(uri) {
		var oldResourceURI = this.getResourceURI();
		this.graph.findAndRemove(this.entryURI, terms.resource);
		this.graph.create(this.entryURI, terms.resource, {type: "uri", value: uri});
		var stmts = this.graph.find(oldResourceURI);
		for (var i=0;i<stmts.length;i++) {
			stmts[i].setSubject(uri);
		}
	};
	
	ei.getEntryType = function() {
		var et = this.graph.findFirstValue(this.entryURI, terms.rdf.type);
		return terms.entryType[et || "default"];
	};

	ei.getResourceType = function() {
		return this._getResourceType(terms.resourceType);
	};

	ei.getGraphType = function() {
		return this._getResourceType(terms.graphType);
	};

	ei._getResourceType = function(vocab) {
		var stmts = this.graph.find(this.getResourceURI(), terms.rdf.type);
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
	 * 	 admin:  [principalURI1, principalURI2, ...],
	 *   rread:  [principalURI3, ...],
	 *   rwrite: [principalURI4, ...],
	 *   mread:  [principalURI5, ...],
	 *   mwrite: [principalURI6, ...]
	 * }
	 * 
	 * There will always be an array for each key, it might be empty though.
	 * The principalURI must be the URI to the resource of a user or group entry.
	 * 
	 * Please note that a non empty acl overrides any defaults from the surrounding context.
	 * 
	 * @return an acl object.
	 */
	ei.getACL = function() {
		var f = function(stmt) { return stmt.getValue();};  //Statement > object value.
		var ru = this.getResourceURI(), mu = this.getMetadataURI();
		return {
			admin:	array.map(this.graph.find(this.entryURI, terms.write), f),
			rread:	array.map(this.graph.find(ru, terms.read), f),
			rwrite:	array.map(this.graph.find(ru, terms.write), f),
			mread:	array.map(this.graph.find(mu, terms.read), f),
			mwrite:	array.map(this.graph.find(mu, terms.write), f)
		};
	};
	
	/**
	 * Replaces the current acl with the provided acl. The acl object is the same as you get from the getACL call.
	 * The only difference is that the acl object from this method is allowed to be empty 
	 * or leave out some keys that are not to be set.
	 * 
	 * @param acl {Object} same kind of object you get from getACL.
	 */
	ei.setACL = function(acl) {
		var f = function(subj, pred, principals) {
			this.graph.findAndRemove(subj, pred);
			array.forEach(principals || [], function(principal) {
				this.graph.create(subj, pred, {type: "uri", value: principal});
			});
		};
		acl = acl || {};
		var ru = this.getResourceURI(), mu = this.getMetadataURI();
		f(this.entryURI, terms.write, acl.admin);
		f(ru, terms.read, acl.rread);
		f(ru, terms.write, acl.rread);
		f(mu, terms.read, acl.mread);
		f(mu, terms.write, acl.mread);
	};

	return EntryInfo;
});