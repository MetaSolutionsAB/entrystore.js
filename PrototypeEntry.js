/*global define*/
define([
    "store/Entry",
	"store/EntryInfo",
	"store/terms"
], function(Entry, EntryInfo, terms) {

	/**
     * A PrototypeEntry is used to create new entries by collecting information about the initial state of the entry
     * to send along to the repository upon creation.
     *
     * All access and utility methods from Entry is just inherited. Some methods have been moved over from
     * EntryInformation to allow easier method chaining. Finally some information cannot be changed in an entry, e.g.
     * the entry, graph and resource types, but are crucial before creation. Hence, some methods have been introduced
     * to cover for this need.
     *
     * @exports store/PrototypeEntry
	 * @param {store/Context} context where this prototypeEntry belongs.
     * @param {string} id - entry identifier, if not unique in the context the subsequent commit will fail
	 * @class
     * @augments store/Entry
	 */
	var PrototypeEntry = function(context, id) {
		if (id != null) {
            this.specificId = id;
        }
        id = id || "_newId";
		var cru = context.getResourceURI();
		var entryInfo = new EntryInfo(cru + "/entry/"+id, null, context.getEntryStore());
        if (context.getId() === "_contexts") {
            entryInfo._resourceURI = context.getEntryStore().getBaseURI()+id;
        } else {
            entryInfo._resourceURI = cru + "/resource/"+id;
        }
        var oldSetResourceURI = entryInfo.setResourceURI;
        entryInfo.setResourceURI = function(uri) {
            this._resourceURI = uri;
            oldSetResourceURI.call(this, uri);
        };
        entryInfo.getResourceURI = function() {
            return this._resourceURI;
        };

        Entry.apply(this, [context, entryInfo]); //Call the super constructor.
    };

    //Inheritance trick
    var F = function() {};
    F.prototype = Entry.prototype;
    PrototypeEntry.prototype = new F();


    /**
     * Direct access method for the resource instance for prorotypeEntries.
     * @returns {store/Resource}
     */
    PrototypeEntry.prototype.getResource = function() {
        return this._resource;
    }

    /**
     * Exposes the {@link store/EntryInfo#setACL setACL} method from {@link store/EntryInfo} on PrototypeEntry
     * and makes it chainable.
     *
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    PrototypeEntry.prototype.setACL = function() {
        EntryInfo.prototype.setACL.apply(this._entryInfo, arguments);
        return this;
    };

    /**
     * Exposes the {@link store/EntryInfo#setResourceURI setResourceURI} method from {@link store/EntryInfo} on this class
     * and makes it chainable.
     *
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    PrototypeEntry.prototype.setResourceURI = function() {
        EntryInfo.prototype.setResourceURI.apply(this._entryInfo, arguments);
        return this;
    };

    /**
     * Exposes the {@link store/EntryInfo#setExternalMetadataURI setExternalMetadataURI} method from {@link store/EntryInfo} on this class
     * and makes it chainable.
     *
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    PrototypeEntry.prototype.setExternalMetadataURI = function() {
        EntryInfo.prototype.setExternalMetadataURI.apply(this._entryInfo, arguments);
        return this;
    };

    /**
     * Makes it possible to change the EntryType (which is not allowed on existing entries).
     *
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    PrototypeEntry.prototype.setEntryType = function(et) {
        var uri = terms.invEntryType[et];
        if (uri) {
            this._entryInfo.getGraph().create(this._entryInfo.getEntryURI(), terms.rdf.type, {type: "uri", value: uri});
        }
        return this;
    };

    /**
     * Makes it possible to change the GraphType (which is not allowed on existing entries).
     *
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    PrototypeEntry.prototype.setGraphType = function(gt) {
        this._gt = gt;
        var uri = terms.invGraphType[gt];
        if (uri) {
            this._entryInfo.getGraph().create(this._entryInfo.getResourceURI(), terms.rdf.type, {type: "uri", value: uri});
        }
        return this;
    };

    /**
     * Makes it possible to change the ResourceType (which is not allowed on existing entries).
     *
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    PrototypeEntry.prototype.setResourceType = function(rt) {
        var uri = terms.invResourceType[rt];
        if (uri) {
            this._entryInfo.getGraph().create(this._entryInfo.getResourceURI(), terms.rdf.type, {type: "uri", value: uri});
        }
        return this;
    };

    /**
     * When creating new entries a single parent list can be specified, hence we need a way to set it
     * in PrototypeEntry.
     *
     * @param {store/Entry} parentListEntry
     * @returns {store/PrototypeEntry} - to allow the method call to be chained.
     */
    PrototypeEntry.prototype.setParentList = function(parentListEntry) {
        this.parentListEntry = parentListEntry;
        return this;
    };

    /**
     * Get the parent list (as an entry) for this PrototypeEntry.
     * @returns {store/Entry}
     */
    PrototypeEntry.prototype.getParentList = function() {
        return this.parentListEntry;
    };

    /**
     * Get the suggested entry id for this PrototypeEntry
     * @returns {string}
     */
    PrototypeEntry.prototype.getSpecificId = function() {
        return this.specificId;
    };

    /**
     * Committing just metadata not allowed on a PrototypeEntry since there is no
     * entry in the repository yet. Use commit to create the entire entry instead.
     * @override
     */
    PrototypeEntry.prototype.commitMetadata = function() {
        throw "Not supported on PrototypeEntry, call commit instead."
    };

    /**
     * Committing just cached external metadata is not allowed on a PrototypeEntry since there is no
     * entry in the repository yet. Use commit to create the entire entry instead.
     * @override
     */
    PrototypeEntry.prototype.commitCachedExternalMetadata = function() {
        throw "Not supported on PrototypeEntry, call commit instead."
    };


    /**
     * @deprecated use {@link store/PrototypeEntry#commit commit} instead.
     * @returns {entryPromise}
     */
    PrototypeEntry.prototype.create = function() {
        return this._context.getEntryStore().createEntry(this);
    };

    /**
     * Create a new entry according to the information specified in the prototype entry.
     *
     * @returns {entryPromise}
     * @see store/EntryStore#createEntry
     */
    PrototypeEntry.prototype.commit = function() {
        return this._context.getEntryStore().createEntry(this);
    };


	return PrototypeEntry;
});