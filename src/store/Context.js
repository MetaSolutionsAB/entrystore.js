/*global define*/
define([
	"dojo/Deferred"
], function(Deferred) {
	
	/**
	 * @param entry in which this context is a resource.
	 * @constructor
	 */
	var Context = function(entry) {
		this._entry = entry;
	};
	var co = Context.prototype; //Shortcut, avoids having to write Context.prototype everywhere below when defining methods.

	co.getEntryStore = function() {
		return this._entry.getEntryStore();
	};

	/**
	 * @return the entry where this context is a resource.
	 */
	co.getOwnEntry = function() {
		return this._entry;
	};
	
	co.listEntries = function(optionalPagingParams) {
		var d = new Deferred();		
		this.getEntryStore().getEntry(this.getOwnEntry.getResourceURI()+"/entry/_all", optionalPagingParams).then(function(entry) {
			var list = entry.getResource();
			list.get(optionalPagingParams).then(function(entries) {
				d.resolve(entries, list);
			}, function(err) {
				d.reject(err);
			});
		}, function(err) {
			d.reject("Failed fetching all entries. "+err);
		});
		return d.promise;
	};
	
	/** 
	 * Convenience method, same as context.getOwnEntry.getMetadata()
	 */
	co.getMetadata = function() {
		return this.getOwnEntry().getMetadata();
	};
	
	/**
	 * Convenience method, same as context.getOwnEntry.setMetadata(metadata)
	 */
	co.setMetadata = function(metadata) {
		return this.getOwnEntry().setMetadata(metadata);
	};
	
	/**
	 * Convenience method, see EntryStore.getEntry()
	 */
	co.getEntry = function(entryURI, optionalLoadParams) {
		return this.getEntryStore().getEntry(entryURI, optionalLoadParams);
	};
	
	/**
	 * Convenience method, see EntryStore.createEntry()
	 */
	co.createEntry = function(prototypeEntry, parentListEntry) {
		return this.getEntryStore().createEntry(this.getOwnEntry(), prototypeEntry, parentListEntry);
	};

/*
	context.addRemoteListener(listener); // websockets; listening to remote changes of this context
	context.removeRemoteListener(listener);
*/

	return co;
});