/*global define*/
define([
    'store/StringResource',
    'store/types',
    "dojo/Deferred",
	"./PrototypeEntry",
    "./Resource",
    "./RDFGraph"
], function(StringResource, types, Deferred, PrototypeEntry, Resource, RDFGraph) {

    /**
     * @param {String} entryURI in which this context is a resource.
     * @param {String} resourceURI
     * @param {store.EntryStore} entryStore
     * @constructor
     * @extends store.Resource
	 */
	var Context = function(entryURI, resourceURI, entryStore) {
        Resource.apply(this, arguments); //Call the super constructor.
	};

    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    Context.prototype = new F();

    /**
     * Retrieves a list of all entries, returned in a promise.
     * TODO document optionalPagingParams
     *
     * @param {Object=} optionalPagingParams
     * @returns {dojo.promsise.Promise}
     */
	Context.prototype.listEntries = function(optionalPagingParams) {
		var d = new Deferred();		
		this.getEntryStore().getEntry(this._resourceURI+"/entry/_all", optionalPagingParams).then(function(entry) {
			var list = entry.getResource();
			list.get(optionalPagingParams).then(function(entries) {
				d.resolve(entries, list);
			}, function(err) {
				d.reject(err);
			});
		}, function(err) {
			d.reject("Failed fetching all entries. "+err);
		});
		return d.promise;
	};
		
	/**
	 * Convenience method, to retrieve an entry from this context, see EntryStore.getEntry().
     * @returns {dojo.promise.Promise}
     * @see store.EntryStore#getEntry
	 */
	Context.prototype.getEntry = function(entryURI, optionalLoadParams) {
        return this.getEntryStore().getEntry(entryURI, optionalLoadParams);
	};

    /**
     * Convenience method, to retrieve an entry from this context, see EntryStore.getEntry().
     * @returns {dojo.promise.Promise}
     * @see store.EntryStore#getEntry
     */
    Context.prototype.getEntryById = function(entryId, optionalLoadParams) {
        return this.getEntryStore().getEntry(this.getEntryURI(entryId), optionalLoadParams);
    };

    Context.prototype.getEntryURI = function(entryId) {
        return this.getEntryStore().getEntryURI(this.getId(), entryId);
    };

    /**
     * Factory method to create a prototypeEntry that has the current context as container.
     * Call .create() on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {String} id an optional id for the entry, fails if an entry exists already with this id.
     * @returns {store.PrototypeEntry}
     */
	Context.prototype.newEntry = function(id) {
		return new PrototypeEntry(this, id);
	};


    /**
     * Factory method to create a link-prototypeEntry that has the current context as container.
     * Call .create() on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {String} link is the URI for the resource we are making a link to, mandatory.
     * @param {String} id an optional id for the entry, fails if an entry exists already with this id.
     * @returns {store.PrototypeEntry}
     */
    Context.prototype.newLink = function(link, id) {
        return new PrototypeEntry(this, id).setResourceURI(link).setEntryType(types.ET.LINK);
    };


    /**
     * Factory method to create a linkref-prototypeEntry that has the current context as container.
     * Call .create() on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {String} link is the URI for the resource we are making a link to, mandatory.
     * @param {String} metadatalink is the URI for the metadata are referring to, mandatory.
     * @param {String} id an optional id for the entry, fails if an entry exists already with this id.
     * @returns {store.PrototypeEntry}
     */
    Context.prototype.newLinkRef = function(link, metadatalink, id) {
        return new PrototypeEntry(this, id).setResourceURI(link).setExternalMetadataURI(metadatalink).setEntryType(types.ET.LINKREF);
    };

    /**
     * Factory method to create a ref-prototypeEntry that has the current context as container.
     * Call .create() on the PrototypeEntry to actually create it (returns a promise).
     * The only difference to the newLinkRef method is that the EntryType is Reference instead of LinkReference,
     * that is there is no local metadata.
     *
     * @param {String} link is the URI for the resource we are making a link to, mandatory.
     * @param {String} metadatalink is the URI for the metadata are referring to, mandatory.
     * @param {String} id an optional id for the entry, fails if an entry exists already with this id.
     * @returns {store.PrototypeEntry}
     */
    Context.prototype.newRef = function(link, metadatalink, id) {
        return new PrototypeEntry(this, id).setResourceURI(link).setExternalMetadataURI(metadatalink).setEntryType(types.ET.REF);
    };

    /**
     * Factory method to create a List prototypeEntry that has the current context as container.
     * Call .create() on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {String} id an optional id for the entry, fails if an entry exists already with this id.
     * @returns {store.PrototypeEntry}
     */
    Context.prototype.newList = function(id) {
        return new PrototypeEntry(this, id).setGraphType(types.GT.LIST);
    };

    /**
     * Factory method to create a Graph prototypeEntry that has the current context as container.
     * Call .create() on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {rdfjson.Graph} the RDF graph to store.
     * @param {String} id an optional id for the entry, fails if an entry exists already with this id.
     * @returns {store.PrototypeEntry}
     */
    Context.prototype.newGraph = function(graph, id) {
        var pe = new PrototypeEntry(this, id).setGraphType(types.GT.GRAPH);
        var ei = pe.getEntryInfo();
        pe.entry._resource = new RDFGraph(ei.getEntryURI(), ei.getResourceURI(), this.getEntryStore(), graph || {});
        return pe;
    };

    /**
     * Factory method to create a Graph prototypeEntry that has the current context as container.
     * Call .create() on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {String} str an optional string for the StringResource.
     * @param {String} id an optional id for the entry, fails if an entry exists already with this id.
     * @returns {store.PrototypeEntry}
     */
    Context.prototype.newString = function(str, id) {
        var pe = new PrototypeEntry(this, id).setGraphType(types.GT.STRING);
        var ei = pe.getEntryInfo();
        pe.entry._resource = new StringResource(ei.getEntryURI(), ei.getResourceURI(), this.getEntryStore(), str);
        return pe;
    };

    /*
        context.addRemoteListener(listener); // websockets; listening to remote changes of this context
        context.removeRemoteListener(listener);
    */

	return Context;
});