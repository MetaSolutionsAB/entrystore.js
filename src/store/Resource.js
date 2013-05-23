/*global define*/
define([
	"dojo/Deferred",
    "./factory"
], function(Deferred, factory) {

    /**
     * @param {String} entryURI in which this context is a resource.
     * @param {String} resourceURI
     * @param {store.EntryStore} entryStore
     * @constructor
	 */
	var Resource = function(entryURI, resourceURI, entryStore) {
		this._entryURI = entryURI;
		this._resourceURI = resourceURI;
		this._entryStore = entryStore;
	};

    /**
     * @returns {store.EntryStore}
     */
	Resource.prototype.getEntryStore = function() {
		return this._entryStore;
	};

	/**
	 * @return {dojo.promise.Promise} that on success provides the entry for this context.
	 */
	Resource.prototype.getOwnEntry = function() {
		return this._entryStore.getEntry(this._entryURI);
	};

    /**
     * @returns {String}
     */
	Resource.prototype.getOwnResourceURI = function() {
		return this._resourceURI;
	};

    /**
     * @returns {String}
     */
	Resource.prototype.getOwnEntryURI = function() {
		return this._entryURI;
	};

    /**
     * @returns {String}
     */
    Resource.prototype.getId = function() {
        return factory.getId(this._entryURI);
    };

	return Resource;
});