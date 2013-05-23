/*global define*/
define([
	"dojo/Deferred",
	"./PrototypeEntry",
    "./Resource"
], function(Deferred, PrototypeEntry, Resource) {

    /**
     * @param {String} entryURI in which this context is a resource.
     * @param {String} resourceURI
     * @param {store.EntryStore} entryStore
     * @constructor
     * @extends store.Resource
	 */
	var Context = function(entryURI, resourceURI, entryStore) {
        Resource.apply(this, arguments); //Call the super constructor.
	};

    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    Context.prototype = new F();

    /**
     * Retrieves a list of all entries, returned in a promise.
     * TODO document optionalPagingParams
     *
     * @param {Object=} optionalPagingParams
     * @returns {dojo.promsise.Promise}
     */
	Context.prototype.listEntries = function(optionalPagingParams) {
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
	 * Convenience method, to retrieve an entry from this context, see EntryStore.getEntry().
     * @returns {dojo.promise.Promise}
     * @see store.EntryStore#getEntry
	 */
	Context.prototype.getEntry = function(entryURI, optionalLoadParams) {
		return this.getEntryStore().getEntry(entryURI, optionalLoadParams);
	};
	
	/**
	 * Convenience method, to create an entry, see EntryStore.createEntry()
     * @returns {dojo,promise.Promise} where the callback will contain the entry.
     * @see store.EntryStore#createEntry
	 */
	Context.prototype.createEntry = function(prototypeEntry, parentListEntry) {
		return this.getEntryStore().createEntry(prototypeEntry, parentListEntry);
	};

    /**
     * Factory method to create a prototypeEntry that has the current context as container.
     * @returns {store.PrototypeEntry}
     */
	Context.prototype.createPrototypeEntry = function() {
		return new PrototypeEntry(this);
	};
/*
	context.addRemoteListener(listener); // websockets; listening to remote changes of this context
	context.removeRemoteListener(listener);
*/

	return Context;
});