/*global define*/
define([
	"dojo/_base/array",
	"dojo/Deferred",
	"./Cache",
	"./rest",
	"./factory"
], function(array, Deferred, Cache, rest, factory) {
	
	/**
	 * @param baseURI is an optional URL to the current EntryStore
	 * @param authScheme is optional, see the auth method.
	 * @param credentials is optional, see the auth method.
	 * @Class
	 */
	var EntryStore = function(baseURI, authScheme, credentials) {
		this._baseURI = baseURI;
		this._cache = new Cache();
		if (authScheme) {
			this.auth(authScheme, credentials);
		}
		this._contexts = {};
		this._rest = rest;
	};
	var es = EntryStore.prototype; //Shortcut, avoids having to write EntryStore.prototype everywhere below when defining methods.
	
	es.auth = function(authScheme, credentials) {
		this._rest.auth(authScheme, credentials);
		this._cache.invalidateCache();
	};

	es.logout = function() {
		this.auth();
	};

	/**
	 * @param entryURI is the entry URI of an entry.
	 * @param optionalLoadParams is optional parameters for how to load an entry, mainly relevant when the entry is a list.
	 * @return a Promise which on success provides an Entry instance.
	 */
	es.getEntry = function(entryURI, optionalLoadParams) {
		var forceLoad = optionalLoadParams ? optionalLoadParams.forceLoad === true : false;
		var e = this._cache.get(entryURI);
		if (e && !forceLoad) {
			return e.refresh(); //Will only refresh if needed, a promise is returned in any case
		} else {
			var d = new Deferred(), self = this;
			this._rest.get(factory.getEntryLoadURI(entryURI, optionalLoadParams)).then(function(data) {
				//The entry, will always be there.
				var entry = factory.updateOrCreate(entryURI, data, self);
				d.resolve(entry);
			}, function(err) {
				d.reject("Failed fetching entry. "+err);
			});
			return d.promise;
		}
	};
	
	/**
	 * Convenience method for getting a hold of a context, similar to getEntry, 
	 * but returns a context instance instead (can be retrieved from an context entry via entry.getResource()).
	 * 
	 * @param contextURI is the URI to an entry which is a context, e.g. base/_contexts/entry/1.
	 * @return a promise which on success returns an instance of Context.
	 */
	es.getContext = function(contextURI) {
		var d = new Deferred();
		this.getEntry(contextURI).then(function(entry) {
			d.resolve(entry.getResource());
		}, function(err) {
			d.reject("Failed fetching the context. "+err);
		});
		return d.promise;
	};
	
	/**
	 * @return a promise which on success returns an array of contexts and as a second argument a list containing the context-entries (useful in case of pagination).
	 */
	es.getContexts = function(optionalPagingParams) {
		var d = new Deferred();		
		this.getEntry(this._baseURI+"_principals/entry/_all", optionalPagingParams).then(function(entry) {
			var list = entry.getResource();
			list.get(optionalPagingParams).then(function(entries) {
				d.resolve(array.map(entries, function(entry) {return entry.getResource();}), list);
			}, function(err) {
				d.reject(err);
			});
		}, function(err) {
			d.reject("Failed fetching all contexts. "+err);
		});
		return d.promise;
	};
	
	
	/**
	 * @param prototypeEntry a fake entry that acts as a prototype, i.e. containing characteristics of the to be created entry. Must be provided, includes which context the entry should be created in.
	 * @param parentListEntry an entry corresponding to a list to which the entry should be added as a child.    
	 */
	es.createEntry = function(prototypeEntry, parentListEntry) {
		var d = new Deferred();
		this._rest.post(
				factory.getEntryCreateURI(context, prototypeEntry, parentListEntry),
				factory.getEntryCreatePostData(prototypeEntry)).then(function(location) { //Success, a new created entry exists
			es.getEntry(location).then(function(entry) {  //Lets load it the regular way.
				d.resolve(entry);
			}, function(err) {
				d.reject("Succeded in creating entry, but failed loading it afterward, very strange, check EntryScape logs. "+err);
			});
		}, function(err) {
			d.reject("Failed fetching entry. "+err);
		});
		return d.promise;
	};
	
	/**
	 * @param prototypeContextEntry is an entry, only acl, local metadata and id will be considered 
	 * (unless the context exists, in which case the id will be ignored as well).
	 */
	es.createContext = function(prototypeContextEntry) {
		//TODO
		//return rest.createEntry(prototypeContextEntry).then(this.cache.cache);
	};
	
	es.addCacheUpdateListener = function(listener) {
		this._cache.addCacheUpdateListener(listener);
	};
	es.removeCacheUpdateListener = function(listener) {
		this._cache.removeCacheUpdateListener (listener);		
	};
	es.invalidateCache = function() {
		this._cache.invalidateCache();
	};
	
	es.version = function() {
		//TODO
	};

	es.status = function() {
		//TODO admin only
	};
	
	
	es.moveEntry = function(entry, fromList, toList) {
		var uri = factory.getMoveURI(entry, fromList, toList, this._baseURI);
		return rest.post(uri, "");
	};
	
	es.loadViaProxy = function(uri, formatHint) {
		var url = factory.getProxyURI(uri, formatHint);
		return rest.get(url);
	};
	
	//==============Non-public methods==============

	es._getBaseURI = function() {
		return this._baseURI;
	};
	
	es._getCache = function() {
		return this._cache;
	};
	
	es._getREST = function() {
		return this._rest;
	}

	es._getCachedContextsIdx = function() {
		return this._contexts;
	};
	
	// TODO user and group handling (get/add/update/remove)
	return EntryStore;
});
