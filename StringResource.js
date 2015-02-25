/*global define*/
define([
    "store/Resource"
], function(Resource) {
	
	/**
     * StringResource is a resource for handling simple strings of data.
     *
     * @exports store/StringResource
     * @param {string} entryURI - URI to an entry where this resource is contained.
     * @param {string} resourceURI - URI to the resource.
     * @param {store/EntryStore} entryStore - the API's repository instance.
     * @param {string} data - the actual string, may the empty string, but not null or undefined.
	 * @constructor
     * @extends store/Resource
	 */
	var Str = function(entryURI, resourceURI, entryStore, data) {
        Resource.apply(this, arguments); //Call the super constructor.
        this._data = data;
	};
    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    Str.prototype = new F();

    /**
     * @returns {string} may be an empty string, never null or undefined.
     */
    Str.prototype.getString = function() {
        return this._data;
    };

    /**
     * Set a new string, does not save it to the repository, use commit for that. E.g.
     *
     *     stringresource.setString("New value").commit().then(function() {...});
     *
     * @param {string} string - the new string
     * @returns {store/StringResource} allows chaining with commit.
     * @see store/StringResource#commit
     */
    Str.prototype.setString = function(string) {
        this._data = string || "";
        return this;
	};


    /**
     * Pushes the string back to the repository.
     *
     * @returns {xhrPromise}
     * @see store/StringResource#setString
     */
    Str.prototype.commit = function() {
        return this._entryStore.getREST().put(this._resourceURI, this._data);
    };


    Str.prototype.getSource = function() {
        return this._data;
    };

    return Str;
});