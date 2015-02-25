define([
    "store/List"
], function(List) {

    /**
     * Group is a subclass of the List resource and contains a list of users.
     * The group resource URI can be referred to from access control lists.
     *
     * @exports store/Group
     * @param {string} entryURI - URI to an entry where this resource is contained.
     * @param {string} resourceURI - URI to the resource.
     * @param {store/EntryStore} entryStore - the API's repository instance.
     * @class
     * @augments store.List
     */
	var Group = function(entryURI, resourceURI, entryStore) {
        List.apply(this, arguments); //Call the super constructor.
	};

    //Inheritance trick
    var F = function() {};
    F.prototype = List.prototype;
    Group.prototype = new F();


    /**
     * Get the name of the group, this is a a unique name (username) in the current repository's _principals context.
     * @returns {string}
     */
    Group.prototype.getName = function() {
        return this._name;
    };

    /**
     * Set a new name of the group, it will not succeed if it is already in use, for instance by another user or group.
     * @param {string} name
     * @returns {xhrPromise}
     */
    Group.prototype.setName = function(name) {
        var oldname = this._name;
        this._name = name;
        return this._entryStore.getREST().put(this.getEntryURI()+"/name", json.stringify({name: name})).then(function(data) {
            return data;
        }, lang.hitch(this, function(e) {
            this._name = oldname;
            throw e;
        }));
    };

    //Data contains allUnsorted array, size, and children.
	Group.prototype._update = function(data, children) {
        List.prototype._update.apply(this, arguments);
        this._name = data.name;
	};

    return Group;
});