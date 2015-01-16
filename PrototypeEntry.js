/*global define*/
define([
    "store/Entry",
	"store/EntryInfo",
	"store/terms"
], function(Entry, EntryInfo, terms) {
	
	/**
     * @exports store/PrototypeEntry
	 * @param {store/Context} context where this prototypeEntry belongs.
	 * @class
     * @augments store/Entry
	 */
	var PrototypeEntry = function(context, id) {
		if (id != null) {
            this.specificId = id;
        }
        id = id || "_newId";
		var cru = context.getResourceURI();
		var entryInfo = new EntryInfo(cru + "/entry/"+id);
		entryInfo.setResourceURI(cru + "/resource/"+id);
		entryInfo.getGraph().create(entryInfo.getEntryURI(), terms.metadata, {type: "uri", value: cru + "/metadata/"+id});
        Entry.apply(this, [context, entryInfo]); //Call the super constructor.
    };

    //Inheritance trick
    var F = function() {};
    F.prototype = Entry.prototype;
    PrototypeEntry.prototype = new F();



//-----EntryInfo setters, now chainable as methods on PrototypeEntry.-----
    PrototypeEntry.prototype.setACL = function() {
        EntryInfo.prototype.setACL.apply(this._entryInfo, arguments);
        return this;
    };

    PrototypeEntry.prototype.setResourceURI = function() {
        EntryInfo.prototype.setResourceURI.apply(this._entryInfo, arguments);
        return this;
    };

    PrototypeEntry.prototype.setExternalMetadataURI = function() {
        EntryInfo.prototype.setExternalMetadataURI.apply(this._entryInfo, arguments);
        return this;
    };

//Additional set methods not available on EntryInfo since you are not supposed to change these values for created entries.
    PrototypeEntry.prototype.setEntryType = function(et) {
        var uri = terms.invEntryType[et];
        if (uri) {
            this._entryInfo.getGraph().create(this._entryInfo.getEntryURI(), terms.rdf.type, {type: "uri", value: uri});
        }
        return this;
    };
    PrototypeEntry.prototype.setGraphType = function(gt) {
        this._gt = gt;
        var uri = terms.invGraphType[gt];
        if (uri) {
            this._entryInfo.getGraph().create(this._entryInfo.getResourceURI(), terms.rdf.type, {type: "uri", value: uri});
        }
        return this;
    };
    PrototypeEntry.prototype.setResourceType = function(rt) {
        var uri = terms.invResourceType[rt];
        if (uri) {
            this._entryInfo.getGraph().create(this._entryInfo.getResourceURI(), terms.rdf.type, {type: "uri", value: uri});
        }
        return this;
    };

    PrototypeEntry.prototype.setParentList = function(parentListEntry) {
        this.parentListEntry = parentListEntry;
        return this;
    };

    PrototypeEntry.prototype.getParentList = function() {
        return this.parentListEntry;
    };

    PrototypeEntry.prototype.getSpecificId = function() {
        return this.specificId;
    };

 //Override some set methods since they are not supposed to send information to the repository in a PrototypeEntry.
    PrototypeEntry.prototype.setMetadata = function(graph) {
        this._metadata = graph;
        return this;
    };

    PrototypeEntry.prototype.setCachedExternalMetadata = function(graph) {
        this._cachedExternalMetadata = graph;
        return this;
    };


    /**
     * @deprecated use {@link store/PrototypeEntry#commit commit} instead.
     * @returns {dojo/promise/Promise}
     */
    PrototypeEntry.prototype.create = function() {
        return this._context.getEntryStore().createEntry(this);
    };

    /**
     * Create a new entry according to the information specified in the prototype entry.
     *
     * @returns {dojo/promise/Promise}
     */
    PrototypeEntry.prototype.commit = function() {
        return this._context.getEntryStore().createEntry(this);
    };


	return PrototypeEntry;
});