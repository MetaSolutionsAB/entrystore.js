/*global define*/
define([
	"dojo/_base/array",
    "store/Entry",
	"store/EntryInfo",
	"store/terms",
    "store/User"
], function(array, Entry, EntryInfo, terms, User) {
	
	/**
	 * @param {store.Context} context where this prototypeEntry belongs.
	 * @class
	 */
	var PrototypeEntry = function(context, id) {
		if (id != null) {
            this.specificId = id;
        }
        id = id || "_newId";
        this.context = context;
		var cru = context.getOwnResourceURI();
		this.entryInfo = new EntryInfo(cru + "/entry/"+id);
		this.entryInfo.setResourceURI(cru + "/resource/"+id);
		//No setter in EntryInfo since metadata is not supposed to be set from externally.
		this.entryInfo.getGraph().create(this.entryInfo.getEntryURI(), terms.metadata, {type: "uri", value: cru + "/metadata/"+id});
		this.entry = new Entry(context, this.entryInfo, context.getEntryStore());
	};

	//EntryInfo setters, now chainable as methods on PrototypeEntry.
	array.forEach(["setResourceURI", "setACL", "setExternalMetadataURI"], function(method) {
		PrototypeEntry.prototype[method] = function() {
			EntryInfo.prototype[method].apply(this.entryInfo, arguments);
			return this;
		};
	});

	//Entry setters, now chainable as methods on PrototypeEntry.
/*	array.forEach(["setMetadata", "setCachedExternalMetadata"], function(method) {
		PrototypeEntry.prototype[method] = function() {
			Entry.prototype[method].apply(this.entry, arguments);
			return this;
		};
	}); */

	//Now make PrototypeEntry appear as a readable Entry by copying over all vital read methods 
	//(e.g. getXX methods, ignoring the isXX  methods since they are convienance methods not used internally in the API).
	array.forEach(["getEntryInfo", "getContext", "getMetadata", "getCachedExternalMetadata", "getExtractedMetadata", 
        "getResourceURI", "getResource", "getReferrers",
        "isLocal", "isLink", "isReference", "isLinkReference"], function(method) {
        PrototypeEntry.prototype[method] = function() {
			return Entry.prototype[method].apply(this.entry, arguments);
		};
	});

    PrototypeEntry.prototype.getSpecificId = function() {
        return this.specificId;
    };

    PrototypeEntry.prototype.setMetadata = function(graph) {
        this.entry._metadata = graph;
        return this;
    };

    PrototypeEntry.prototype.setCachedExternalMetadata = function(graph) {
        this.entry._cachedExternalMetadata = graph;
        return this;
    };

	//Additional set methods not available on EntryInfo since you are not supposed to change these values for created entries.
	PrototypeEntry.prototype.setEntryType = function(et) {
		var uri = terms.invEntryType[et.toLowerCase()];
		if (uri) {
			this.entryInfo.getGraph().create(this.entryInfo.getEntryURI(), terms.rdf.type, {type: "uri", value: uri});
		}
		return this;
	};
	PrototypeEntry.prototype.setGraphType = function(gt) {
        this._gt = gt;
        var uri = terms.invGraphType[gt.toLowerCase()];
		if (uri) {
			this.entryInfo.getGraph().create(this.entryInfo.getResourceURI(), terms.rdf.type, {type: "uri", value: uri});
		}
		return this;
	};
	PrototypeEntry.prototype.setResourceType = function(rt) {
		var uri = terms.invResourceType[rt.toLowerCase()];
		if (uri) {
			this.entryInfo.getGraph().create(this.entryInfo.getResourceURI(), terms.rdf.type, {type: "uri", value: uri});
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

    PrototypeEntry.prototype.create = function() {
        return this.context.getEntryStore().createEntry(this);
    };

	return PrototypeEntry;
});