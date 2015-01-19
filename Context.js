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
     * @exports store/Context
     * @param {String} entryURI in which this context is a resource.
     * @param {String} resourceURI
     * @param {store/EntryStore} entryStore
     * @class
     * @augments store/Resource
	 */
	var Context = function(entryURI, resourceURI, entryStore) {
        Resource.apply(this, arguments); //Call the super constructor.
	};

    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    Context.prototype = new F();

    /**
     * Retrieves a list of entries in the context.
     *
     * @param {Object} sort - same sort object as provided in the optionalLoadParams to {@see store/EntryStore#getEntry getEntry} method.
     * @param {Object} limit - same limit as provided in the optionalLoadParams to {@see store/EntryStore#getEntry getEntry} method.
     * @param {integer} page - unless limit is set to -1 (no pagination) we need to specify which page to load, first page is 0.
     * @returns {dojo/promise/Promise} upon success the promise returns an array of entries.
     * @see store/EntryStore#getListEntries
     */
	Context.prototype.listEntries = function(sort, limit, page) {
		return this.getEntryStore().getListEntries(this._resourceURI+"/entry/_all", sort, limit, page);
	};

    /**
     * Convenience method, to retrieve an entry from this context.
     *
     * @returns {dojo.promise.Promise}
     * @see store.EntryStore#getEntry
     */
    Context.prototype.getEntryById = function(entryId, optionalLoadParams) {
        return this.getEntryStore().getEntry(this.getMemberEntryURI(entryId), optionalLoadParams);
    };

    /**
     * Expands the given entry id into a full URI.
     *
     * @param {string} entryId
     * @returns {string} the URI for an entry in this context with the given id.
     */
    Context.prototype.getEntryURIbyId = function(entryId) {
        return this.getEntryStore().getEntryURI(this.getId(), entryId);
    };

    /**
     * Factory method to create a PrototypeEntry that has the current context as container.
     * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it
     * (returns a promise).
     *
     * @param {string=} id - id for the entry, fails after commit if an entry exists already with this id.
     * @returns {store/PrototypeEntry}
     */
	Context.prototype.newEntry = function(id) {
		return new PrototypeEntry(this, id);
	};

    /**
     * Factory method to create a PrototypeEntry that corresponds to a link that has the current context as container.
     * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {string} link - the URI for the resource we are making a link to, mandatory.
     * @param {string=} id - id for the entry, fails after commit if an entry exists already with this id.
     * @returns {store/PrototypeEntry}
     */
    Context.prototype.newLink = function(link, id) {
        return new PrototypeEntry(this, id).setResourceURI(link).setEntryType(types.ET_LINK);
    };

    /**
     * Factory method to create a PrototypeEntry that is a linkref that has the current context as container.
     * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {string} link - is the URI for the resource we are making a link to, mandatory.
     * @param {string} metadatalink - is the URI for the metadata are referring to, mandatory.
     * @param {string=} id - id for the entry, fails after commit if an entry exists already with this id.
     * @returns {store/PrototypeEntry}
     */
    Context.prototype.newLinkRef = function(link, metadatalink, id) {
        return new PrototypeEntry(this, id).setResourceURI(link).setExternalMetadataURI(metadatalink).setEntryType(types.ET_LINKREF);
    };

    /**
     * Factory method to create a PrototypeEntry that is a reference and has the current context as container.
     * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it (returns a promise).
     * The only difference to the newLinkRef method is that the EntryType is Reference instead of LinkReference which
     * implies that there is no local metadata.
     *
     * @param {string} link - the URI for the resource we are making a link to, mandatory.
     * @param {string} metadatalink - the URI for the metadata are referring to, mandatory.
     * @param {string=} id for the entry, fails after commit if an entry exists already with this id.
     * @returns {store/PrototypeEntry}
     */
    Context.prototype.newRef = function(link, metadatalink, id) {
        return new PrototypeEntry(this, id).setResourceURI(link).setExternalMetadataURI(metadatalink).setEntryType(types.ET_REF);
    };

    /**
     * Factory method to create a PrototypeEntry whose resource is a {@link store/List List) and has the current context as container.
     * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {string} id an optional id for the entry, fails on commit if an entry exists already with this id.
     * @returns {store/PrototypeEntry}
     */
    Context.prototype.newList = function(id) {
        return new PrototypeEntry(this, id).setGraphType(types.GT_LIST);
    };

    /**
     * Factory method to create a PrototypeEntry whose resource is a {@link store/RDFGraph Graph} and has the current context as container.
     * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {rdfjson.Graph} graph - graph to store as a resource.
     * @param {string=} id - id for the entry, fails upon commit if an entry exists already with this id.
     * @returns {store/PrototypeEntry}
     */
    Context.prototype.newGraph = function(graph, id) {
        var pe = new PrototypeEntry(this, id).setGraphType(types.GT_GRAPH);
        var ei = pe.getEntryInfo();
        pe._resource = new RDFGraph(ei.getEntryURI(), ei.getResourceURI(), this.getEntryStore(), graph || {});
        return pe;
    };

    /**
     * Factory method to create a PrototypeEntry whose resource is a {@link store/StringResource String} that has the current context as container.
     * Call {@link store/PrototypeEntry#commit commit} on the PrototypeEntry to actually create it (returns a promise).
     *
     * @param {string=} str an optional string for the StringResource.
     * @param {String} id an optional id for the entry, fails upon commit if an entry exists already with this id.
     * @returns {store/PrototypeEntry}
     */
    Context.prototype.newString = function(str, id) {
        var pe = new PrototypeEntry(this, id).setGraphType(types.GT_STRING);
        var ei = pe.getEntryInfo();
            pe._resource = new StringResource(ei.getEntryURI(), ei.getResourceURI(), this.getEntryStore(), str);
        return pe;
    };


    /**
     * The name for this context.
     *
     * @returns {string}
     */
    Context.prototype.getName = function() {
        return this._name;
    };

    /**
     * Change of context name, succeds if name is not in use already by another context.
     * @param {string} name
     * @returns {dojo/promise/Promise}
     */
    Context.prototype.setName = function(name) {
        var oldname = this._name;
        this._name = name;
        return this._entryStore.getREST().put(this.getEntryURI()+"/name", json.stringify({name: name})).then(function(data) {
            return data;
        }, lang.hitch(this, function(e) {
            this._name = oldname;
            throw e;
        }));
    };

    /*
        context.addRemoteListener(listener); // websockets; listening to remote changes of this context
        context.removeRemoteListener(listener);
    */
    Context.prototype._update = function(data) {
        this._name = data.alias || data.name; //TODO, change to only name after clean-up
    };

	return Context;
});