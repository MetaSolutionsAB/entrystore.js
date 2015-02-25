/*global define*/
define([
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/json",
    "store/terms",
	"store/factory",
	"rdfjson/Graph",
    "dojo/date/stamp"
], function(array, Deferred, json, terms, factory, Graph, stamp) {
	
	/**
     * EntryInfo is a class that contains all the administrative information for an entry.
     * @exports store/EntryInfo
     * @param {String} entryURI must be provided unless the graph contains a statement with the store:resource property which allows us to infer the entryURI.
	 * @param {rdfjson/Graph} graph corresponds to a rdfjson.Graph class with the entryinfo as statements
     * @param {store/EntryStore} entryStore
	 * @class
	 */
	var EntryInfo = function(entryURI, graph, entryStore) {
		this._entryURI = entryURI || graph.find(null, terms.resource)[0].getSubject();
		this._graph = graph || new Graph();
		this._entryStore = entryStore;
	};

    /**
     * @returns {store/Entry}
     */
	EntryInfo.prototype.getEntry = function() {
		return this._entry;
	};

    /**
     * @param {rdfjson/Graph} graph
     */
	EntryInfo.prototype.setGraph = function(graph) {
		this._graph = graph;
	};

    /**
     * @return {rdfjson/Graph}
     */
	EntryInfo.prototype.getGraph = function() {
		return this._graph;
	};


    /**
     * Pushes the entry information to the repository, e.g. posts to basepath/store/{contextId}/entry/{entryId}
     * @returns {entryInfoPromise}
     */
	EntryInfo.prototype.commit = function() {
		var d = new Deferred(), self = this;
        this._entry.getEntryStore().getREST().put(this.getEntryURI(), json.stringify(this._graph.exportRDFJSON())).then(function() {
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
        return factory.getEntryId(this._entryURI);
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
		if (oldResourceURI) {
            var stmts = this._graph.find(oldResourceURI);
            for (var i=0;i<stmts.length;i++) {
                stmts[i].setSubject(uri);
            }
        }
	};

    /**
     * @returns {String} one of the entryTypes
     * @see store/terms#entryType
     */
    EntryInfo.prototype.getEntryType = function() {
		var et = this._graph.findFirstValue(this._entryURI, terms.rdf.type);
		return terms.entryType[et || "default"];
	};

    var getResourceType = function(entry, vocab) {
        var stmts = entry._graph.find(entry.getResourceURI(), terms.rdf.type);
        for (var i=0;i<stmts.length;i++) {
            var t = vocab[stmts[i].getValue()];
            if (t != null) {
                return t;
            }
        }
        return vocab["default"];
    };

    /**
     * the resource type of the entry, e.g. "Information", "Resolvable" etc.
     * The allowed values are available in store/types beginning with 'RT_'.
     * E.g. to check if the entry is an information resource:
     * if (ei.getResourceType() === types.RT_INFORMATIONRESOURCE) {...}
     *
     * @returns {String}
     */
    EntryInfo.prototype.getResourceType = function() {
		return getResourceType(this, terms.resourceType);
	};

    /**
     * the graph type of the entry, e.g. "User", "List", "String", etc.
     * The allowed values are available in store/types beginning with 'GT_'.
     * E.g. to check if the entry is a list:
     * if (ei.getGraphType() === types.GT_LIST) {...}
     *
     * @returns {String}
     */
	EntryInfo.prototype.getGraphType = function() {
		return getResourceType(this, terms.graphType);
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
	 * The principalURI* will always be an URI to the resource of a user or group entry.
	 * 
	 * Please note that a non empty acl overrides any defaults from the surrounding context.
	 *
     * @param {boolean} asIds - if true the principalURIs are shortened to entry identifiers.
	 * @return {Object} an acl object.
	 */
	EntryInfo.prototype.getACL = function(asIds) {
		var f = function(stmt) {
            if (asIds) {
                return factory.getEntryId(stmt.getValue());
            } else {
                return stmt.getValue();
            }
        };  //Statement > object value.
		var ru = this.getResourceURI(), mu = this.getMetadataURI();
		var acl = {
			admin:	array.map(this._graph.find(this._entryURI, terms.acl.write), f),
			rread:	array.map(this._graph.find(ru, terms.acl.read), f),
			rwrite:	array.map(this._graph.find(ru, terms.acl.write), f),
			mread:	array.map(this._graph.find(mu, terms.acl.read), f),
			mwrite:	array.map(this._graph.find(mu, terms.acl.write), f)
		};
        acl.contextOverride = acl.admin.length !== 0 || acl.rread.length !== 0 || acl.rwrite.length !== 0
            || acl.mread.length !== 0 || acl.mwrite.length !== 0;
        return acl;
	};

    /**
     * if the entry has an explicit ACL or if the containing contexts ACL is used.
     *
     * @returns {boolean}
     */
    EntryInfo.prototype.hasACL = function() {
        return this.getACL().contextOverride;
    };

	/**
	 * Replaces the current acl with the provided acl. The acl object is the same as you get from the getACL call.
	 * The first difference is that the acl object from this method is allowed to be empty
	 * or leave out some keys that are not to be set.
     * The second difference is that it allows entryIds as values in the arrays, not only full resource URIs,
     * both have to refer to principals though.
	 * 
	 * @param {Object} acl same kind of object you get from getACL.
	 */
	EntryInfo.prototype.setACL = function(acl) {
        var g = this._graph;
		var f = function(subj, pred, principals, base) {
			g.findAndRemove(subj, pred);
			array.forEach(principals || [], function(principal) {
                if (principal.length < base.length || principal.indexOf(base) !== 0) { //principal is entry id.
                    g.add(subj, pred, {type: "uri", value: base+principal});
                } else {
                    g.add(subj, pred, {type: "uri", value: principal}); //principal is a full entry resource uri.
                }
			});
		};
		acl = acl || {};
		var ru = this.getResourceURI(), mu = this.getMetadataURI();
        var base = factory.getResourceBase(this._entry.getEntryStore(), this._entry.getContext().getId());
		f(this._entryURI, terms.acl.write, acl.admin, base);
		f(ru, terms.acl.read, acl.rread, base);
		f(ru, terms.acl.write, acl.rread, base);
		f(mu, terms.acl.read, acl.mread, base);
		f(mu, terms.acl.write, acl.mread, base);
	};

    /**
     * @returns {string} the label of the resource of this entry, typically set when uploading a file.
     */
    EntryInfo.prototype.getLabel = function() {
        return this._graph.findFirstValue(this.getResourceURI(), "http://www.w3.org/2000/01/rdf-schema#label");
    };

    /**
     * Sets a new label of the resource in the graph, call {@link store/EntryInfo#commit commit} to push
     * the updated graph to the repository.
     *
     * @param {string} label - a new label for the resource.
     */
    EntryInfo.prototype.setLabel = function(label) {
        this._graph.findAndRemove(this.getResourceURI(), "http://www.w3.org/2000/01/rdf-schema#label");
        if (label != null && label != "") {
            this._graph.add(this.getResourceURI(), "http://www.w3.org/2000/01/rdf-schema#label", {type: "literal", value: label});
        }
    };

    /**
     * @returns {string} the format of the resource of this entry.
     */
    EntryInfo.prototype.getFormat = function() {
        return this._graph.findFirstValue(this.getResourceURI(), "http://purl.org/dc/terms/format");
    };

    /**
     * Sets a new format of the resource in the graph, call {@link store/EntryInfo#commit commit} to push
     * the updated graph to the repository.
     *
     * @param {string} format - a format in the form application/json or text/plain.
     */
    EntryInfo.prototype.setFormat = function(format) {
        this._graph.findAndRemove(this.getResourceURI(), "http://purl.org/dc/terms/format");
        if (format != null && format != "") {
            this._graph.add(this.getResourceURI(), "http://purl.org/dc/terms/format", {type: "literal", value: format});
        }
    };

    /**
     * @returns {Date} the date when the entry was created.
     */
    EntryInfo.prototype.getCreationDate = function() {
        var d = this._graph.findFirstValue(this.getEntryURI(), "http://purl.org/dc/terms/created");
        return stamp.fromISOString(d); //Must always exist.
    };

    /**
     * @returns {Date} the date of last modification (according to the repository, local changes are not reflected).
     */
    EntryInfo.prototype.getModificationDate = function() {
        var d = this._graph.findFirstValue(this.getEntryURI(), "http://purl.org/dc/terms/modified");
        if (d != null) {
            return stamp.fromISOString(d);
        } else {
            return this.getCreationDate();
        }
    };

    /**
     * @returns {String} a URI to creator, the user Entrys resource URI is used, e.g. "http://somerepo/store/_principals/resource/4", never null.
     */
    EntryInfo.prototype.getCreator = function() {
        return this._graph.findFirstValue(this.getEntryURI(), "http://purl.org/dc/terms/creator");
    };

    /**
     * @returns {Array} an array of URIs to the contributors using their Entrys resource URIs,
     * e.g. ["http://somerepo/store/_principals/resource/4"], never null although the array might be empty.
     */
    EntryInfo.prototype.getContributors = function() {
        return array.map(this._graph.find(this.getEntryURI(), "http://purl.org/dc/terms/contributor"), function(statement) {return statement.getValue();});
    };

    return EntryInfo;
});

/**
 * Promise that provides an {@link store/Entry} on success.
 *
 * @name entryInfoPromise
 * @extends dojo/promise/Promise
 * @class
 */
/**
 * @name entryInfoPromise#then
 * @param {entryInfoCallback} onSuccess
 * @param {xhrFailureCallback} onError
 */
/**
 * This is a successful callback method to be provided as first argument in a {@link entryInfoPromise}
 *
 * @callback entryInfoCallback
 * @param {store/EntryInfo} entry
 */