/*global define*/
define([
	"dojo/Deferred",
	"dojo/json",
	"./factory"
], function(Deferred, json, rest, factory) {
	
	/**
	 * @param entryInfo that defines the basics of this entry.
	 * @constructor
	 */
	var Entry = function(context, entryInfo, entryStore) {
		this._context = context;
		this._entryInfo = entryInfo;
		this._entryInfo._entry = this;
		this._entryStore = entryStore;
	};
	var en = Entry.prototype; //Shortcut, avoids having to write Entry.prototype below when defining methods.

	en.getEntryStore = function() {
		return this._entryStore;
	};	

	en.getEntryInfo = function() {
		return this._entryInfo;
	};

	/**
	 * Convenience method, same as calling entry.getEntryInfo().getEntryURI()
	 * @return {String} the entry uri.
	 */
	en.getURI = function() {
		return this._entryInfo.getEntryURI();
	};
	
	/**
	 * That an entry needs to be refreshed typically means that it contains stale data (with respect to what is available in the store). 
	 * The entry should be refresh before it is further used.
	 * 
	 * @param {Boolean} silently the cache will send out a stale message (to all registered listeners of the cache)
	 * for this entry if the value is false or undefined.
	 * @see Entry.refresh.
	 */
	en.needRefresh = function(silently) {
		this.getEntryStore().getCache().needRefresh(this, silently);
	};
	
	/**
	 * Refreshes an entry if needed, that is, if it has been marked as invalid.
	 * @param {Boolean} silently the cache will send out a refresh message for this entry 
	 * if a refresh was needed AND if the value of silently is false or undefined.   
	 */
	en.refresh = function(silently) {
		var d = new Deferred();
		if (this._stale) {
			var self = this, entryURI = this.getURI();
			this.getEntryStore()._getREST().get(factory.getEntryLoadURI(entryURI)).then(function(data) {
				factory.update(self, data);
				self.getEntryStore().getCache().cache(entry, silently);
				d.resolve(self);
			}, function(err) {
				d.reject("Failed refreshing entry. "+err);
			});
		} else {
			d.resolve(this);
		}
		return d.promise;
	};
	
	en.getContext = function() {
		return this._context;
	};
	
	/**
	 * @return {Graph} a RDF graph with metadata, typically containing statements about the resourceURI.
	 */
	en.getMetadata = function() {
		return this._metadata;
		//graph = rdfjson.Graph, same object in consecutive calls unless setMetadata has been called in between.
	};
	
	/**
	 * Updates the metadata for this entry.
	 * Invalidates all graph object previously retrieved via getMetadata.
	 * Setting metadata for an entry with entrytype 'reference' will change it to 'linkreference'. 
	 * 
	 * @param {Graph} graph is an RDF graph with metadata, if it is not provided the current metadata graph is saved (there is currently no check whether it has been modified or not).
	 * @return {Promise} a promise that on success will contain the current updated entry (the entry is not replaced only updated). 
	 */
	en.setMetadata = function(graph) {
		var d = new Deferred(), self = this;
		this._metadata= graph || this._metadata;
		this.getEntryStore()._getREST().put(this.getEntryInfo().getMetadataURI(), json.stringify(this._metadata.exportRDFJSON())).then(function() {
			self.needRefresh(true);
			self.refresh().then(function() {
				d.resolve(self);
			}, function() {
				//Failed refreshing, but succeded at saving metadata, at least send out message that it needs to be refreshed.
				self.getEntryStore()._getCache().message("refreshed", self);
				d.resolve(self);
			});
		}, function(err) {
			d.reject("Failed saving metadata. "+err);
		});
		return d.promise;
	};
	
	/**
	 * Cached external metadata can only be provided for entries with entrytype reference or linkreference.
	 * @return {Graph} a RDF graph with cached external metadata, typically containing statements about the resourceURI.
	 */	
	en.getCachedExternalMetadata = function() {
		return this._cachedExternalMetadata;
	};

	/**
	 * Updates the cached external metadata for this entry.
	 * Invalidates all graph object previously retrieved via getCachedExternalMetadata.
	 * 
	 * @param {Graph} graph is an RDF graph with metadata, if it is not provided the current cached external metadata graph is saved (there is currently no check whether it has been modified or not).
	 * @return {Promise} a promise that on success will contain the current updated entry (the entry is not replaced only updated). 
	 */	
	en.setCachedExternalMetadata = function(graph) {
		var d = new Deferred(), self = this;
		this._cachedExternalMetadata = graph || this._cachedExternalMetadata;
		this.getEntryStore()._getREST().put(this.getEntryInfo().getCachedExternalMetadataURI(), json.stringify(this._cachedExternalMetadata.exportRDFJSON())).then(function() {
			self.needRefresh(true);
			self.refresh().then(function() {
				d.resolve(self);
			}, function() {
				//Failed refreshing, but succeded at saving metadata, at least send out message that it needs to be refreshed.
				self.getEntryStore()._getCache().message("refreshed", self);
				d.resolve(self);
			});
		}, function(err) {
			d.reject("Failed saving cached external metadata. "+err);
		});
		return d.promise;
	};

	en.getExtractedMetadata = function() {
		return this._extractedMetadata;
	};
	
	en.getResourceURI = function() {
		this._entryInfo.getResourceURI();
	};

	en.getResource = function() {
		return this._resource;
	};
	
	en.getReferrers = function() {
		//TODO
	};

	en.isList = function() {
		return this.getEntryInfo().getGraphType() === "list";
	};
	en.isResultList = function() {
		return this.getEntryInfo().getGraphType() === "resultlist";
	};
	en.isContext = function() {
		return this.getEntryInfo().getGraphType() === "context";
	};
	en.isSystemContext = function() {
		return this.getEntryInfo().getGraphType() === "systemcontext";
	};
	en.isUser = function() {
		return this.getEntryInfo().getGraphType() === "user";
	};
	en.isGroup = function() {
		return this.getEntryInfo().getGraphType() === "group";
	};
	en.isGraph = function() {
		return this.getEntryInfo().getGraphType() === "graph";
	};
	en.isString = function() {
		return this.getEntryInfo().getGraphType() === "string";
	};
	en.isLink = function() {
		return this.getEntryInfo().getEntryType() === "link";		
	};
	en.isReference = function() {
		return this.getEntryInfo().getEntryType() === "reference";		
	};
	en.isLinkReference = function() {
		return this.getEntryInfo().getEntryType() === "linkreference";		
	};
	en.isExternal = function() {
		return this.getEntryInfo().getEntryType() !== "local";
	};
	en.isLocal = function() {
		return this.getEntryInfo().getEntryType() === "local";
	};

	en.canAdministerEntry = function() {
		return this._rights.administer;
	};

	en.canReadResource = function() {
		return this._rights.administer || this._rights.readresource || this._rights.writeresource;
	};

	en.canWriteResource = function() {
		return this._rights.administer || this._rights.writeresource;
	};

	en.canReadMetadata = function() {
		return this._rights.administer || this._rights.readmetadata || this._rights.writemetadata;
	};

	en.canWriteMetadata = function() {
		return this._rights.administer || this._rights.writemetadata;
	};


	en.setResource = function(binary) {
		//TODO
	};
	
	en.resourceFileUpload = function(DOMInputElement) {
		//TODO
	};


	/**
	 * Deletes this entry without any option to recover it.
	 * @param recursive {Boolean} if true and the entry is a list it will delete the entire tree of lists 
	 * and all entries that is only contained in the current list or any of its child lists. 
	 * @return {Promise} which on success indicates that the deletion has succeded.
	 */
	en.del = function(recursive) {
		if (recursive === true) {
			return this.getEntryStore()._getREST().del(this.getURI()+"?recursive=true");
		} else {
			return this.getEntryStore()._getREST().del(this.getURI());
		}
	};
	return Entry;
});