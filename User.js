/*global define*/
define([
    "dojo/json",
    "dojo/_base/lang",
    "store/Resource"
], function(json, lang, Resource) {
	
	/**
     * User instances are resources corresponding to users that can be authenticated to access the EntryStore repository.
     * The user resource URI can be referred to from access control lists.
     *
     * @exports store/User
     * @param {string} entryURI - URI to an entry where this resource is contained.
     * @param {string} resourceURI - URI to the resource.
     * @param {store/EntryStore} entryStore - the API's repository instance.
     * @param {Object} data - information about the user, e.g. object containing name and homecontext.
	 * @class
     * @extends store/Resource
	 */
	var User = function(entryURI, resourceURI, entryStore, data) {
        Resource.apply(this, arguments); //Call the super constructor.
        this._data = data;
	};
    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    User.prototype = new F();

    /**
     * Get the name of the user, this is a a unique name (username) in the current repository's _principals context.
     * @returns {string}
     */
    User.prototype.getName = function() {
        return this._data.name;
    };

    /**
     * Set a new name (username), it will not succeed if it is already in use, for instance by another user or group.
     * @param {string} name
     * @returns {xhrPromise}
     */
    User.prototype.setName = function(name) {
        var oldname = this._data.name;
        this._data.name = name;
        var es = this._entryStore;
        return es.handleAsync(es.getREST().put(this._resourceURI, json.stringify({name: name}))
            .then(lang.hitch(this, function(data) {
                var e = this.getEntry(true);
                if (e) {
                    e.getEntryInfo()._name = data;
                }
                return data;
        }), lang.hitch(this, function(e) {
            this._data.name = oldname;
            throw e;
        })), "setUserName");
    };

    /**
     * Get the preferred language of the user.
     * @returns {string}
     */
    User.prototype.getLanguage = function() {
        return this._data.language;
    };

    /**
     * Sets the preferred language of a user.
     * @param {string} language
     * @returns {xhrPromise}
     */
    User.prototype.setLanguage = function(language) {
        var oldlanguage = this._data.language;
        this._data.language = language;
        var es = this._entryStore;
        return es.handleAsync(es.getREST().put(this._resourceURI, json.stringify({language: language})).then(function(data) {
            return data;
        }, lang.hitch(this, function(e) {
            this._data.language = oldlanguage;
            throw e;
        })), "setUserLanguage");
    };

    /**
     * Set a new password for the user.
     *
     * @param {string} password - a new password, should be at least 8 characters long.
     * @returns {xhrPromise}
     */
    User.prototype.setPassword = function(password) {
        var es = this._entryStore;
        return es.handleAsync(es.getREST().put(this._resourceURI, json.stringify({password: password})), "setUserPassword");
    };

    /**
     * Get the home context for this user.
     *
     * @returns {string} - a context id (not the full resource URI).
     */
    User.prototype.getHomeContext = function() {
        return this._data.homecontext;
    };

    /**
     * Set a new home context for this user.
     *
     * @param {string} contextId - a context id (not the full resource URI).
     * @returns {xhrPromise}
     */
    User.prototype.setHomeContext = function(contextId) {
        var oldhc = this._data.homecontext;
        this._data.homecontext = contextId;
        var es = this._entryStore;
        return es.handleAsync(es.getREST().put(this._resourceURI, json.stringify({homecontext: contextId}))
            .then(function(data) {return data;}, lang.hitch(this, function(e) {
                this._data.homecontext = oldhc;
                throw e;
            })), "setUserHomeContext");
    };


    /**
     * Get custom properties.
     *
     * @returns {object} - key value pairs of custom properties.
     */
    User.prototype.getCustomProperties = function() {
        return this._data.customProperties || {};
    };

    /**
     * Set a new home context for this user.
     *
     * @param {string} contextId - a context id (not the full resource URI).
     * @returns {xhrPromise}
     */
    User.prototype.setCustomProperties = function(customProperties) {
        var oldcp = this._data.customProperties;
        this._data.customProperties = customProperties;
        var es = this._entryStore;
        return es.handleAsync(es.getREST().put(this._resourceURI, json.stringify({customProperties: customProperties}))
            .then(function(data) {return data;}, lang.hitch(this, function(e) {
                this._data.customProperties = oldcp;
                throw e;
            })), "setUserCustomProperties");
    };

    User.prototype.getSource = function() {
        return this._data;
    };

    return User;
});