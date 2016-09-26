/*global define*/
define([], function() {

    /**
     * This is the base class for resources contained by entries, do not use directly, instead use a subclass.
     *
     * @exports store/Resource
     * @param {string} entryURI - URI to an entry where this resource is contained.
     * @param {string} resourceURI - URI to the resource.
     * @param {store/EntryStore} entryStore - the API's repository instance.
     * @class
     * @see subclass {@link store/Context}
     * @see subclass {@link store/List}
     * @see subclass {@link store/Graph}
     * @see subclass {@link store/String}
     * @see subclass {@link store/File}
     * @see subclass {@link store/User}
     * @see subclass {@link store/Group}
     */
	var Resource = function(entryURI, resourceURI, entryStore) {
		this._entryURI = entryURI;
		this._resourceURI = resourceURI;
		this._entryStore = entryStore;
	};

    /**
     * Retrieves the API's repository instance
     *
     * @returns {store/EntryStore}
     */
	Resource.prototype.getEntryStore = function() {
		return this._entryStore;
	};

	/**
     * Retrieves the entry that contains this resource. Asking for the entry directly (direct=true, rather than getting
     * it asynchronously via a promise) should work for all resources except context resources.
     *
     * > _**Advanced explanation:**
     * > Context resources are often created opportunistically by the API without also
     * > loading the context entry along with it, e.g. when loading entries during a search operation. The reason why
     * > the context entries are not loaded along with the context resource is that such an approach, depending on
     * > the use-case, may lead to dramatic increases in the amount of requests to the repository._
     *
	 * @return {entryPromise|store/Entry} if direct=true an Entry is returned (or undefined if not in cache,
     * only happens sometimes for Contexts) otherwise a promise is returned that on success provides the entry for this resource.
	 */
	Resource.prototype.getEntry = function(direct) {
		return this._entryStore.getEntry(this._entryURI, {direct:direct});
	};

    /**
     * The resources own URI.
     *
     * @returns {string}
     */
	Resource.prototype.getResourceURI = function() {
		return this._resourceURI;
	};

    /**
     * The URI to the entry containing this resource.
     *
     * @returns {string}
     */
	Resource.prototype.getEntryURI = function() {
		return this._entryURI;
	};

    /**
     * The id for the entry containing this resource.
     *
     * @returns {string}
     */
    Resource.prototype.getId = function() {
        return this._entryStore.getFactory().getEntryId(this._entryURI);
    };

    Resource.prototype._update = function(data) {
        this._data = data;
    };
    Resource.prototype.getSource = function() {
        return this._data;
    };

    return Resource;
});

/**
 * @name resourcePromise
 * @extends dojo/promise/Promise
 * @class
 */

/**
 * @name resourcePromise#then
 * @param {entryCallback} onSuccess
 * @param {xhrFailureCallback} onError
 */

/**
 * This is a successful callback method to be provided as first argument in a {@link resourcePromise}
 *
 * @callback resourceCallback
 * @param {store/Resource} resource
 */