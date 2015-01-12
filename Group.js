define([
    "store/List"
], function(List) {

    /**
     * @param {String} entryURI in which this Group is a resource.
     * @param {String} resourceURI
     * @param {store.EntryStore} entryStore
     * @constructor
     * @extends store.Resource
     */
	var Group = function(entryURI, resourceURI, entryStore) {
        List.apply(this, arguments); //Call the super constructor.
	};

    //Inheritance trick
    var F = function() {};
    F.prototype = List.prototype;
    Group.prototype = new F();

    Group.prototype.getName = function() {
        return this._name;
    };

	//Data contains allUnsorted array, size, and children.
	Group.prototype._update = function(data, children) {
        List.prototype._update.apply(this, arguments);
        this._name = data.name;
	};

    return Group;
});