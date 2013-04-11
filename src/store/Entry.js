/*global define*/
define([
	"dojo/Deferred",
	"./rest"
], function(Deferred, rest) {
	
	/**
	 * @param entryInfo that defines the basics of this entry.
	 * @constructor
	 */
	var Entry = function(context, entryInfo) {
		this._context = context;
		this._entryInfo = entryInfo;
	};
	var en = Entry.prototype; //Shortcut, avoids having to write Entry.prototype below when defining methods.

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
	
	en.refresh = function(callback) {
		//TODO
		//Callback will be called with entry as sole parameter, directly or indirectly depending on whether it needs to be refreshed.
	};
	
	en.getContext = function() {
		return this._context;
	};
	
	en.getMetadata = function() {
		//TODO  
		//graph = rdfjson.Graph, same object in consecutive calls unless setMetadata has been called in between.
	};
	
	en.setMetadata = function(graph) {
		//TODO should return a promise.
		//Invalidates all graph object previously retrieved via getMetadata.
	};
	
	en.getCachedExternalMetadata = function() {
		//TODO
	};
	
	en.setCachedExternalMetadata = function(graph) {
		//TODO invalidates all cached objects retrived earlier from this instance.
	};

	en.getExtractedMetadata = function() {
		//TODO
	};
	
	en.getResourceURI = function() {
		this._entryInfo.getResourceURI();
	}

	en.getResource = function() {
		//TODO
		//Context, List, User, or Group, Graph, String
	};
	
	en.getReferrers = function() {
		//TODO
	};

/*	
    e.isList() // conv. for e.getEntryInfo().getBuiltinType === BuiltinType.List
	e.isContext()
	e.isUser()
	e.isGroup()
	e.isGraph()
	e.isLink() //Link
	e.isReference()
	e.isLinkReference()
	e.isExternal() //Link, LinkReference, or Reference
	e.isLocal()
*/

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
			return rest.del(this.getURI()+"?recursive=true");
		} else {
			return rest.del(this.getURI());
		}
	};
	return Entry;
});