/*global define*/
define([
    "store/Resource"
], function(Resource) {
	
	/**
     * @param {store.EntryStore} entryStore
     * @param {String} entryURI
	 * @param {String} resourceURI
	 * @constructor
     * @extends store.Resource
	 */
	var Str = function(entryURI, resourceURI, entryStore, data) {
        Resource.apply(this, arguments); //Call the super constructor.
        this._data = data;
	};
    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    Str.prototype = new F();

    Str.prototype.getString = function() {
        return this._data;
    };

    Str.prototype.setString = function(string) {
        this._data = string;
		return this._entryStore.getREST().put(this._resourceURI, this._data);
	};

    Str.prototype.getSource = function() {
        return this._data;
    };

    return Str;
});