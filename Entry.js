/*global define*/
define([
    'dojo/_base/array',
    'dojo/_base/lang',
    "rdfjson/Graph",
    "store/types",
    "dojo/Deferred",
	"dojo/json",
    "./factory"
], function(array, lang, Graph, types, Deferred, json, factory) {
	
	/**
     * @exports store/Entry
     * @param {store/Context} context container for this entry
	 * @param {store/EntryInfo} entryInfo defines the basics of this entry
     * @param {store/EntryStore} entryStore the repository for this entry
	 * @class
	 */
	var Entry = function(context, entryInfo, entryStore) {
		this._context = context;
		this._entryInfo = entryInfo;
		this._entryInfo._entry = this;
		this._entryStore = entryStore;
	};

    /**
     * @returns {store/EntryStore}
     */
    Entry.prototype.getEntryStore = function() {
		return this._entryStore;
	};

    /**
     * @returns {store/EntryInfo}
     */
    Entry.prototype.getEntryInfo = function() {
		return this._entryInfo;
	};

	/**
	 * Convenience method, same as calling entry.getEntryInfo().getEntryURI()
	 * @return {string} the entry uri.
     * @see store/EntryInfo#getEntryURI
	 */
	Entry.prototype.getURI = function() {
		return this._entryInfo.getEntryURI();
	};

    /**
     * Convenience method, same as calling entry.getEntryInfo().getId()
     * @returns {string} the id of the entry
     * @see store/EntryInfo#getId
     */
    Entry.prototype.getId = function() {
        return this._entryInfo.getId();
    };

    /**
     * @returns {string} a URI to the resource of this entry.
     */
    Entry.prototype.getResourceURI = function() {
        return this._entryInfo.getResourceURI();
    };

    /**
	 * That an entry needs to be refreshed typically means that it contains stale data (with respect to what is available in the store). 
	 * The entry should be refresh before it is further used.
	 * 
	 * @param {boolean=} silently the cache will send out a stale message (to all registered listeners of the cache)
	 * for this entry if the value is false or undefined.
	 * @see Entry.refresh.
	 */
	Entry.prototype.setRefreshNeeded = function(silently) {
		this.getEntryStore().getCache().setRefreshNeeded(this, silently);
	};

    /**
     * Tells whether an entry needs to be refreshed.
     *
     * @return {boolean} true if the entry need to be refreshed before used.
     * @see Entry.refresh.
     */
    Entry.prototype.needRefresh = function() {
        return this.getEntryStore().getCache().needRefresh(this);
    };

    /**
	 * Refreshes an entry if needed, that is, if it has been marked as invalid.
	 * @param {boolean=} silently the cache will send out a refresh message for this entry
	 * if a refresh was needed AND if the value of silently is false or undefined. If force is true
     * it will send out a refresh message anyhow.
     * @param {force=} if true the entry will be refreshed independent if it was marked in need of a refresh or not.
	 */
	Entry.prototype.refresh = function(silently, force) {
		var d = new Deferred();
		var es = this.getEntryStore();
        if (force === true || es.getCache().needRefresh(this)) {
			var self = this, entryURI = this.getURI();
			es.getREST().get(factory.getEntryLoadURI(entryURI)).then(function(data) {
				factory.update(self, data);
				es.getCache().cache(self, silently);
				d.resolve(self);
			}, function(err) {
				d.reject("Failed refreshing entry. "+err);
			});
		} else {
			d.resolve(this);
		}
		return d.promise;
	};

    /**
     * @returns {store/Context}
     */
	Entry.prototype.getContext = function() {
		return this._context;
	};
	
	/**
	 * @return {rdfjson/Graph} a RDF graph with metadata, typically containing statements about the resourceURI.
	 */
	Entry.prototype.getMetadata = function() {
		if (this._metadata == null) {
            this._metadata = new Graph();
        }
        return this._metadata;
	};
	
	/**
	 * Updates the metadata for this entry.
	 * Invalidates all graph object previously retrieved via getMetadata.
	 * Setting metadata for an entry with entrytype 'reference' will change it to 'linkreference'. 
	 * 
	 * @param {rdfjson/Graph} graph is an RDF graph with metadata, if it is not provided the current metadata graph is saved (there is currently no check whether it has been modified or not).
	 * @return {dojo/promise/Promise} a promise that on success will contain the current updated entry (the entry is not replaced only updated).
	 */
	Entry.prototype.setMetadata = function(graph) {
		var d = new Deferred(), self = this;
		this._metadata= graph || this._metadata;
        if (this.isReference()) {
            d.reject("Entry \""+this.getURI()+"\" is a reference and have no local metadata that can be saved.");
        } else if (!this.canWriteMetadata()) {
            d.reject("You do not have sufficient access rights to save metadata on entry \""+this.getURI()+"\".");
        } else if(this.needRefresh()) {
            d.reject("The entry \""+this.getURI()+"\" need to be refreshed before its local metadata can be saved.\n"+
                "This message indicates that the client is written poorly, this case should have been taken into account.");
        } else if (this._metadata == null) {
            d.reject("The entry \""+this.getURI()+"\" should allow local metadata to be saved, but there is no local metadata.\n"+
                "This message is a bug in the storejs API.");
        } else {
            this.getEntryStore().getREST().put(this.getEntryInfo().getMetadataURI(), json.stringify(this._metadata.exportRDFJSON())).then(function() {
                self.setRefreshNeeded(true);
                self.refresh().then(function() {
                    d.resolve(self);
                }, function() {
                    //Failed refreshing, but succeded at saving metadata, at least send out message that it needs to be refreshed.
                    self.getEntryStore().getCache().message("refreshed", self);
                    d.resolve(self);
                });
            }, function(err) {
                d.reject("Failed saving local metadata. "+err);
            });
        }
		return d.promise;
	};
	
	/**
	 * Cached external metadata can only be provided for entries with entrytype reference or linkreference.
	 * @return {rdfjson.Graph} a RDF graph with cached external metadata, typically containing statements about the resourceURI.
	 */	
	Entry.prototype.getCachedExternalMetadata = function() {
        if (this._cachedExternalMetadata == null) {
            this._cachedExternalMetadata = new Graph();
        }

        return this._cachedExternalMetadata;
	};

	/**
	 * Updates the cached external metadata for this entry.
	 * Invalidates all graph object previously retrieved via getCachedExternalMetadata.
	 * 
	 * @param {rdfjson/Graph} graph is an RDF graph with metadata, if it is not provided the current cached external metadata graph is saved (there is currently no check whether it has been modified or not).
	 * @return {dojo/promise/Promise} a promise that on success will contain the current updated entry (the entry is not replaced only updated).
	 */	
	Entry.prototype.setCachedExternalMetadata = function(graph) {
		var d = new Deferred(), self = this;
		this._cachedExternalMetadata = graph || this._cachedExternalMetadata;
		this.getEntryStore().getREST().put(this.getEntryInfo().getCachedExternalMetadataURI(), json.stringify(this._cachedExternalMetadata.exportRDFJSON())).then(function() {
			self.setRefreshNeeded(true);
			self.refresh().then(function() {
				d.resolve(self);
			}, function() {
				//Failed refreshing, but succeded at saving metadata, at least send out message that it needs to be refreshed.
				self.getEntryStore().getCache().message("refreshed", self);
				d.resolve(self);
			});
		}, function(err) {
			d.reject("Failed saving cached external metadata. "+err);
		});
		return d.promise;
	};

    /**
     * @returns {rdfjson/Graph}
     */
    Entry.prototype.getExtractedMetadata = function() {
        if (this._extractedMetadata == null) {
            this._extractedMetadata = new Graph();
        }
        return this._extractedMetadata;
	};

    /**
     * Guaranteed to return a resource for List and Context, for other graphtypes the response may be null depending
     * on how the entry was loaded (if indirectly as a child of a list entry the resource will be missing until explicitly
     * loaded with loadResource). Use loadResource to be guaranteed to get a resource back.
     * Although, it will always return null when EntryType is not local!
     *
     * @returns {store/Resource}
     */
    Entry.prototype.getResource = function() {
		return this._resource;
	};

    /**
     * If the EntryType is local then this method retrieves a resource corresponding to the GraphType.
     *
     * @returns {dojo/promise/Promise}
     */
    Entry.prototype.loadResource = function() {
        var d = new Deferred();
        if (this._resource) {
            d.resolve(this._resource);
        } else {
            this._entryStore.getREST().get(this.getResourceURI()).then(lang.hitch(this, function(data) {
                factory.updateOrCreateResource(this, {resource: data}, true);
                d.resolve(this._resource);
            }), function(err) {
                d.reject(err);
            });
        }
        return d.promise;
    };

    /**
     * @returns {rdfjson/Graph}
     */
	Entry.prototype.getReferrersGraph = function() {
        return this._relation;
	};

    /**
     * a list of URIs that has referred to this Entry using various properties.
     *
     * @param {string} prop
     * @returns {string[]}
     */
    Entry.prototype.getReferrers = function(prop) {
        return array.map(this._relation.find(null, prop, null), function(stmt) {
            return stmt.getSubject();
        });
    };

    /**
     * a list of URIs corresponding to list entries where this entry is contained.
     * @returns {string[]}
     */
    Entry.prototype.getParentLists = function() {
        return this.getReferrers("http://entrystore.org/terms/hasListMember");
    };

    /**
     * a list of URIs corresponding to groups where this user entry is member.
     * @returns {string[]}
     */
    Entry.prototype.getParentGroups = function() {
        return this.getReferrers("http://entrystore.org/terms/hasGroupMember");
    };

    /**
     * a list of comments (i.e. their URIs) of this entry.
     * @returns {string[]}
     */
    Entry.prototype.getComments = function() {
        return this.getReferrers("http://ontologi.es/like#regarding");
    };


    /**
     * GraphType list
     * @returns {boolean}
     */
	Entry.prototype.isList = function() {
		return this.getEntryInfo().getGraphType() === types.GT.LIST;
	};
    /**
     * Graphtype resultlist
     * @returns {boolean}
     */
	Entry.prototype.isResultList = function() {
		return this.getEntryInfo().getGraphType() === types.GT.RESULTLIST;
	};
    /**
     * GraphType context
     * @returns {boolean}
     */
	Entry.prototype.isContext = function() {
		return this.getEntryInfo().getGraphType() === types.GT.CONTEXT;
	};
    /**
     * GraphType systemcontext
     * @returns {boolean}
     */
	Entry.prototype.isSystemContext = function() {
		return this.getEntryInfo().getGraphType() === types.GT.SYSTEMCONTEXT;
	};
    /**
     * GraphType user
     * @returns {boolean}
     */
	Entry.prototype.isUser = function() {
		return this.getEntryInfo().getGraphType() === types.GT.USER;
	};
    /**
     * GraphType group
     * @returns {boolean}
     */
	Entry.prototype.isGroup = function() {
		return this.getEntryInfo().getGraphType() === types.GT.GROUP;
	};
    /**
     * GraphType graph
     * @returns {boolean}
     */
	Entry.prototype.isGraph = function() {
		return this.getEntryInfo().getGraphType() === types.GT.GRAPH;
	};
    /**
     * GraphType string
     * @returns {boolean}
     */
	Entry.prototype.isString = function() {
		return this.getEntryInfo().getGraphType() === types.GT.STRING;
	};
    /**
     * GraphType none.
     * @returns {boolean}
     */
    Entry.prototype.isNone = function() {
        return this.getEntryInfo().getGraphType() === types.GT.NONE;
    };
    /**
     * EntryType link
     * @returns {boolean}
     */
	Entry.prototype.isLink = function() {
		return this.getEntryInfo().getEntryType() === types.ET.LINK;
	};
    /**
     * EntryType reference
     * @returns {boolean}
     */
	Entry.prototype.isReference = function() {
		return this.getEntryInfo().getEntryType() === types.ET.REF;
	};
    /**
     * EntryType linkreference
     * @returns {boolean}
     */
	Entry.prototype.isLinkReference = function() {
		return this.getEntryInfo().getEntryType() === types.ET.LINKREF;
	};
    /**
     * EntryType link, linkreference or reference
     * @returns {boolean} true if entrytype is NOT local.
     */
	Entry.prototype.isExternal = function() {
		return this.getEntryInfo().getEntryType() !== types.ET.LOCAL;
	};
    /**
     * EntryType local
     * @returns {boolean}
     */
	Entry.prototype.isLocal = function() {
		return this.getEntryInfo().getEntryType() === types.ET.LOCAL;
	};
    /**
     * @returns {boolean}
     */
	Entry.prototype.canAdministerEntry = function() {
		return this._rights.administer;
	};
    /**
     * @returns {boolean}
     */
	Entry.prototype.canReadResource = function() {
		return this._rights.administer || this._rights.readresource || this._rights.writeresource;
	};
    /**
     * @returns {boolean}
     */
	Entry.prototype.canWriteResource = function() {
		return this._rights.administer || this._rights.writeresource;
	};
    /**
     * @returns {boolean}
     */
	Entry.prototype.canReadMetadata = function() {
		return this._rights.administer || this._rights.readmetadata || this._rights.writemetadata;
	};
    /**
     * @returns {boolean}
     */
	Entry.prototype.canWriteMetadata = function() {
		return this._rights.administer || this._rights.writemetadata;
	};


	Entry.prototype.setResource = function(binary) {
		//TODO
	};
	
	Entry.prototype.resourceFileUpload = function(DOMInputElement) {
		//TODO
	};


	/**
	 * Deletes this entry without any option to recover it.
	 * @param {boolean} recursive if true and the entry is a list it will delete the entire tree of lists
	 * and all entries that is only contained in the current list or any of its child lists. 
	 * @return {dojo/promise/Promise} which on success indicates that the deletion has succeded.
	 */
	Entry.prototype.del = function(recursive) {
		if (recursive === true) {
			return this.getEntryStore().getREST().del(this.getURI()+"?recursive=true");
		} else {
			return this.getEntryStore().getREST().del(this.getURI());
		}
	};

	return Entry;
});