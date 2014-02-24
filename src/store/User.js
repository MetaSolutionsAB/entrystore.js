/*global define*/
define([
    "dojo/json",
    "store/Resource"
], function(json, Resource) {
	
	/**
     * @param {store.EntryStore} entryStore
     * @param {String} entryURI
	 * @param {String} resourceURI
	 * @constructor
     * @extends store.Resource
	 */
	var User = function(entryURI, resourceURI, entryStore, data) {
        Resource.apply(this, arguments); //Call the super constructor.
        this._data = data;
	};
    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    User.prototype = new F();

    User.prototype.getName = function() {
        return this._data["name"];
    };

    User.prototype.setName = function(name) {
        this._data.name = name;
    };

    User.prototype.setPassword = function(password) {
        this._data.password = password;
    };

    User.prototype.getHomeContext = function() {
        return this._data.homecontext;
    };

    User.prototype.setHomeContext = function(context) {
        this._data.homecontext = context;
    };

    //TODO fix ifModifiedSince.
	User.prototype.save = function() {
		return this._entryStore.getREST().put(this._resourceURI, json.stringify(this._data));
	};

    User.prototype.getSource = function() {
        return this._data;
    };

    return User;
});