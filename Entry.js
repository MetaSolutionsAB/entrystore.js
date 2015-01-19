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
     * Entrys are at the center of this API. Entrys holds together metadata, external metadata, resources,
     * access control, and provenance. Hence, entrys appear in the majority of methods, either directly or in
     * callbacks via promises. Each entry has a simple identifier within a context and a globally unique URI that
     * can be used to load, store and index the entry.
     *
     * Many of the methods in this class are convenience methods that allows the developer to interact with
     * the information retrieved from the repository without digging through the RDF graphs. For instance,
     * all methods starting with _can_ or _is_ are convenience methods for working with access control or the type
     * information available in the associated {@link store/EntryInformation} class. The same is true for the
     * majority of the get methods, only those that have corresponding set methods are really unique for this class.
     *
     * @exports store/Entry
     * @param {store/Context} context container for this entry
	 * @param {store/EntryInfo} entryInfo defines the basics of this entry
     * @param {store/EntryStore} entryStore the repository for this entry
	 * @class
	 */
	var Entry = function(context, entryInfo) {
		this._context = context;
		this._entryInfo = entryInfo;
		this._entryInfo._entry = this;
	};

    /**
     * @returns {store/EntryStore}
     */
    Entry.prototype.getEntryStore = function() {
		return this._context.getEntryStore();
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
     * Convenience method, same as calling entry.getEntryInfo().getResourceURI()
     * @returns {string} a URI to the resource of this entry.
     */
    Entry.prototype.getResourceURI = function() {
        return this._entryInfo.getResourceURI();
    };

    /**
     * @returns {store/Context}
     */
	Entry.prototype.getContext = function() {
		return this._context;
	};
	
	/**
     * Provides an RDF graph as an {@link rdfjson/Graph} instance.
	 * @return {rdfjson/Graph} a RDF graph with metadata, typically containing statements about the resourceURI. The
     * returned graph may be empty but never null or undefined.
	 */
	Entry.prototype.getMetadata = function() {
		if (this._metadata == null) {
            this._metadata = new Graph();
        }
        return this._metadata;
	};

    /**
     * Sets a new metadata graph for this entry without pushing it to the repository.
     * In many cases this method is not needed since you can get the metadata graph, modify it and then
     * commit the changes directly.
     *
     * However, in some cases you need to set a new metadata graph, e.g.
     * you want to overwrite the metadata with a new graph retrieved from another source
     * or the entry have been refreshed with new information and you want to commit the merged results.
     * In these cases you need to discard the current metadata graph with help of this method.
     *
     * @param {rdfjson/Graph} graph is an RDF graph with metadata, if it is not provided the current metadata graph is saved (there is currently no check whether it has been modified or not).
     * @return store/Entry - to allow chaining with other methods, e.g. with commitMetadata.
     */
    Entry.prototype.setMetadata = function(graph) {
        this._metadata = graph;
        return this;
    }


    /**
	 * Will push the metadata for this entry to the repository.
	 * If metadata has been set for an entry with EntryType 'reference'
     * the entrytype will change to 'linkreference' upon a successful commit.
	 * 
	 * @return {dojo/promise/Promise} a promise that on success will contain the current updated entry.
	 */
	Entry.prototype.commitMetadata = function() {
		var d = new Deferred(), self = this;
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
	 *
     * @return {rdfjson/Graph} - a RDF graph with cached external metadata, typically containing statements
     * about the resourceURI. The returned graph may be empty but never null or undefined.
	 */	
	Entry.prototype.getCachedExternalMetadata = function() {
        if (this._cachedExternalMetadata == null) {
            this._cachedExternalMetadata = new Graph();
        }

        return this._cachedExternalMetadata;
	};

    /**
     * Sets a new cached external metadata graph for this entry without pushing it to the repository.
     *
     * @param {rdfjson/Graph} graph is an RDF graph with metadata.
     * @return store/Entry - to allow chaining with other methods, e.g. with commitCachedExternalMetadata.
     */
    Entry.prototype.setCachedExternalMetadata = function(graph) {
        this._cachedExternalMetadata = graph || this._cachedExternalMetadata;
        return this;
    };

    /**
	 * Pushes the current cached external metadata graph for this entry to the repository.
	 *
	 * @return {dojo/promise/Promise} a promise that on success will contain the current updated entry.
	 */	
	Entry.prototype.commitCachedExternalMetadata = function() {
		var d = new Deferred(), self = this;
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
     * @todo remains to be supported in repository
     * @returns {rdfjson/Graph}
     */
    Entry.prototype.getExtractedMetadata = function() {
        if (this._extractedMetadata == null) {
            this._extractedMetadata = new Graph();
        }
        return this._extractedMetadata;
	};

    /**
     * Provides the resource for this entry if it exists in a promise, e.g. if the graph-type is not none.
     * It is also possible to request the resource directly, i.e. get the resource rather than a promise.
     * This is achieved by specifying the "direct" parameter as true. This always work for Lists, Groups,
     * and Context resources. For all other resources it will work if the resource, e.g. a RDFGraph,
     * a StringResource etc. is already loaded. If it is not loaded null will be returned.
     *
     * @returns {store/Resource|dojo/promise/Promise}
     */
    Entry.prototype.getResource = function(direct) {
		if (direct) {
            return this._resource;
        }
        var d = new Deferred();
        if (this._resource) {
            d.resolve(this._resource);
        } else {
            this.getEntryStore().getREST().get(this.getResourceURI()).then(lang.hitch(this, function(data) {
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
     * Is the resource of this entry of the GraphType list?
     * @returns {boolean}
     */
	Entry.prototype.isList = function() {
		return this.getEntryInfo().getGraphType() === types.GT_LIST;
	};
    /**
     * Is the resource of this entry of the Graphtype resultlist?
     * @returns {boolean}
     */
	Entry.prototype.isResultList = function() {
		return this.getEntryInfo().getGraphType() === types.GT_RESULTLIST;
	};
    /**
     * Is the resource of this entry of the GraphType context?
     * @returns {boolean}
     */
	Entry.prototype.isContext = function() {
		return this.getEntryInfo().getGraphType() === types.GT_CONTEXT;
	};
    /**
     * Is the resource of this entry of the GraphType systemcontext?
     * @returns {boolean}
     */
	Entry.prototype.isSystemContext = function() {
		return this.getEntryInfo().getGraphType() === types.GT_SYSTEMCONTEXT;
	};

    /**
     * Is the resource of this entry of the GraphType user?
     * @returns {boolean}
     */
	Entry.prototype.isUser = function() {
		return this.getEntryInfo().getGraphType() === types.GT_USER;
	};

    /**
     * Is the resource of this entry of the GraphType group?
     * @returns {boolean}
     */
	Entry.prototype.isGroup = function() {
		return this.getEntryInfo().getGraphType() === types.GT_GROUP;
	};

    /**
     * Is the resource of this entry of the GraphType graph?
     * @returns {boolean}
     */
	Entry.prototype.isGraph = function() {
		return this.getEntryInfo().getGraphType() === types.GT_GRAPH;
	};
    /**
     * Is the resource of this entry of the GraphType string?
     * @returns {boolean}
     */
	Entry.prototype.isString = function() {
		return this.getEntryInfo().getGraphType() === types.GT_STRING;
	};

    /**
     * Is the resource of this entry of the GraphType none?
     * @returns {boolean}
     */
    Entry.prototype.isNone = function() {
        return this.getEntryInfo().getGraphType() === types.GT_NONE;
    };

    /**
     * Is this entry of the EntryType link?
     * @returns {boolean}
     */
	Entry.prototype.isLink = function() {
		return this.getEntryInfo().getEntryType() === types.ET_LINK;
	};

    /**
     * Is this entry of the EntryType reference?
     * @returns {boolean}
     */
	Entry.prototype.isReference = function() {
		return this.getEntryInfo().getEntryType() === types.ET_REF;
	};

    /**
     * Is this entry of the EntryType linkreference?
     * @returns {boolean}
     */
	Entry.prototype.isLinkReference = function() {
		return this.getEntryInfo().getEntryType() === types.ET_LINKREF;
	};

    /**
     * Is the entry of the EntryType link, linkreference or reference?
     * @returns {boolean} true if entrytype is NOT local.
     */
	Entry.prototype.isExternal = function() {
		return this.getEntryInfo().getEntryType() !== types.ET_LOCAL;
	};

    /**
     * Is the entry of the EntryType local?
     * @returns {boolean}
     */
	Entry.prototype.isLocal = function() {
		return this.getEntryInfo().getEntryType() === types.ET_LOCAL;
	};

    /**
     * Is the current user an owner of this entry?
     * @returns {boolean}
     */
	Entry.prototype.canAdministerEntry = function() {
		return this._rights.administer;
	};

    /**
     * Is the current user authorized to read the resource of this entry?
     * @returns {boolean}
     */
	Entry.prototype.canReadResource = function() {
		return this._rights.administer || this._rights.readresource || this._rights.writeresource;
	};

    /**
     * Is the current user authorized to write the resource of this entry?
     * @returns {boolean}
     */
	Entry.prototype.canWriteResource = function() {
		return this._rights.administer || this._rights.writeresource;
	};

    /**
     * Is the current user authorized to read the metadata of this entry?
     * @returns {boolean}
     */
	Entry.prototype.canReadMetadata = function() {
		return this._rights.administer || this._rights.readmetadata || this._rights.writemetadata;
	};

    /**
     * Is the current user authorized to write the metadata of this entry?
     * @returns {boolean}
     */
	Entry.prototype.canWriteMetadata = function() {
		return this._rights.administer || this._rights.writemetadata;
	};

    /**
     * Whether this entry is available publically or not.
     * To make sure this method returns a boolean make sure the contexts entry is loaded, e.g. via:
     * entry.getContext().getEntry().then(function() {
     *    if (entry.isPublic()) {...} //Or whatever you need to do with the isPublic method.
     * }
     *
     * @returns {boolean|undefined} undefined only if the entry has no ACL and the contexts entry which
     * specifies the default access is not cached, otherwise a boolean is returned.
     */
    Entry.prototype.isPublic = function() {
        var guestprincipal = this.getEntryStore().getResourceURI("_principals", "_guest");
        var acl = this.getEntryInfo().getACL();
        if (acl.contextOverride) {
            var ce = this.getContext().getEntry(true);
            if (ce == null) {
                return;
            }
            acl = ce.getEntryInfo().getACL();
            return array.some(["rwrite", "rread"], function(key) {
                return array.indexOf(acl[key], guestprincipal);
            });
        } else {
            return array.some(["rwrite", "rread", "mwrite", "mread"], function(key) {
                return array.indexOf(acl[key], guestprincipal);
            });
        }
    };

    /**
     * Whether this entry is available to the specified user.
     * To make sure this method returns a boolean and not undefined,
     * make sure that the contexts entry is loaded, e.g. via:
     *
     * entry.getContext().getEntry().then(function() {
     *    //And then do you check, e.g.:
     *    entry.getEntryStore().getUserEntry().then(function(currentUserEntry) {
     *       if (entry.isPrivateTo(currentUserEntry) {...}
     *    })
     * }
     *
     * @returns {boolean|undefined} undefined if the contexts entry which
     * specifies the default access is not cached, otherwise a boolean is returned.
     */
    Entry.prototype.isPrivateTo = function(userEntry) {
        var userPrincipal = userEntry.getResourceURI();
        var acl = this.getEntryInfo().getACL();
        var ce = this.getContext().getEntry(true);
        if (ce == null) {
            return;
        }
        var cacl = ce.getEntryInfo().getACL();
        if (cacl.admin.length !== 1 || acl.admin[0] !== userPrincipal) {
            return false;
        }
        if (acl.contextOverride) {
            return acl.admin.length === 1 && acl.admin[0] === userPrincipal;
        }
        return true;
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

    /**
     * That an entry needs to be refreshed typically means that it contains stale data (with respect to what is available in the store).
     * The entry should be refresh before it is further used.
     *
     * @param {boolean=} silently the cache will send out a stale message (to all registered listeners of the cache)
     * for this entry if the value is false or undefined.
     * @see store.Entry#refresh.
     */
    Entry.prototype.setRefreshNeeded = function(silently) {
        this.getEntryStore().getCache().setRefreshNeeded(this, silently);
    };

    /**
     * Tells whether an entry needs to be refreshed.
     *
     * @return {boolean} true if the entry need to be refreshed before used.
     * @see store/Entry#refresh.
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

    return Entry;
});