/*global define*/
define([
	"dojo/_base/array",
	"dojo/_base/lang",
	"./Entry",
	"./EntryInfo",
	"./terms"
], function(array, lang, Entry, EntryInfo, terms) {
	
	/**
	 * @param entryInfo that defines the basics of this entry.
	 * @constructor
	 */
	var PrototypeEntry = function(context) {
		this.context = context;
		var cru = context.getResourceURI();
		this.entryInfo = new EntryInfo(cru + "/entry/_newId");
		this.entryInfo.setResourceURI(cru + "/resource/_newId");
		//No setter in EntryInfo since metadata is not supposed to be set from externally.
		this.entryInfo.getGraph().create(this.entryInfo.getEntryURI(), terms.metadata, {type: "uri", value: cru + "metadata/_newId"});
		this.entry = new Entry(this.entryInfo);
	};
	var pe = PrototypeEntry.prototype; //Shortcut, avoids having to write Entry.prototype below when defining methods.

	//EntryInfo setters, now chainable as methods on PrototypeEntry.
	array.forEach(["setResourceURI", "setACL", "setExternalMetadataURI"], function(method) {
		pe[method] = function() {
			EntryInfo.prototype[method].apply(this.entryInfo, arguments);
			return this;
		};
	});

	//Entry setters, now chainable as methods on PrototypeEntry.
	array.forEach(["setMetadata", "setCachedExternalMetadata"], function(method) {
		pe[method] = function() {
			Entry.prototype[method].apply(this.entry, arguments);
			return this;
		};
	});

	//Now make PrototypeEntry appear as a readable Entry by copying over all vital read methods 
	//(e.g. getXX methods, ignoring the isXX  methods since they are convienance methods not used internally in the API).
	array.forEach(["getEntryInfo", "getContext", "getMetadata", "getCachedExternalMetadata", "getExtractedMetadata", 
				   "getResourceURI", "getResource", "getReferrers"], function(method) {
		pe[method] = function() {
			return Entry.prototype[method].apply(this.entry, arguments);
		};
	});

	//Additional set methods not available on EntryInfo since you are not supposed to change these values for created entries.
	pe.setEntryType = function(et) {
		var uri = terms.invEntryType(et);
		if (uri) {
			this.entryInfo.getGraph().create(this.entryInfo.getEntryURI(), terms.rdf.type, {type: "uri", value: uri});
		}
	};
	pe.setGraphType = function(gt) {
		var uri = terms.invGraphType(gt);
		if (uri) {
			this.entryInfo.getGraph().create(this.entryInfo.geResourceURI(), terms.rdf.type, {type: "uri", value: uri});
		}
	};
	pe.setResourceType = function(rt) {
		var uri = terms.invResourceType(rt);
		if (uri) {
			this.entryInfo.getGraph().create(this.entryInfo.geResourceURI(), terms.rdf.type, {type: "uri", value: uri});
		}
	};

	return PrototypeEntry;
});