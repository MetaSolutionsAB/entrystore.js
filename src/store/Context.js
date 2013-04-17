/*global define*/
define([
	"dojo/Deferred",
	"./PrototypeEntry"
], function(Deferred, PrototypeEntry) {
	
	/**
	 * @param entry in which this context is a resource.
	 * @constructor
	 */
	var Context = function(entryURI, resourceURI, entryStore) {
		this._entryURI = entryURI;
		this._resourceURI = resourceURI;
		this._entryStore = entryStore;
	};
	var co = Context.prototype; //Shortcut, avoids having to write Context.prototype everywhere below when defining methods.

	co.getEntryStore = function() {
		return this._entryStore;
	};

	/**
	 * @return {Promise} that on success provides the entry for this context.
	 */
	co.getOwnEntry = function() {
		return this._entry;
	};
	
	co.getOwnResourceURI = function() {
		return this._resourceURI;
	};
	
	co.getOwnEntryURI = function() {
		return this._entryURI;
	};
	
	co.listEntries = function(optionalPagingParams) {
		var d = new Deferred();		
		this.getEntryStore().getEntry(this._resourceURI+"/entry/_all", optionalPagingParams).then(function(entry) {
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
	 * Convenience method, see EntryStore.getEntry()
	 */
	co.getEntry = function(entryURI, optionalLoadParams) {
		return this.getEntryStore().getEntry(entryURI, optionalLoadParams);
	};
	
	/**
	 * Convenience method, see EntryStore.createEntry()
	 */
	co.createEntry = function(prototypeEntry, parentListEntry) {
		return this.getEntryStore().createEntry(this, prototypeEntry, parentListEntry);
	};

	co.createPrototypeEntry = function() {
		return new PrototypeEntry(this);
	};
/*
	context.addRemoteListener(listener); // websockets; listening to remote changes of this context
	context.removeRemoteListener(listener);
*/

	return Context;
});