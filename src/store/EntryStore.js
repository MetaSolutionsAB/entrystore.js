/*global define*/
define([
	"dojo/_base/array",
	"dojo/Deferred",
	"./cache",
	"./rest",
	"./Context",
	"./Entry"
], function(array, Deferred, cache, rest, require) {
	
	/**
	 * @param baseURI is an optional URL to the current EntryStore
	 * @param authScheme is optional, see the auth method.
	 * @param credentials is optional, see the auth method.
	 * @Class
	 */
	var EntryStore = function(baseURI, authScheme, credentials) {
		this.baseURI = baseURI;
		if (authScheme) {
			this.auth(authScheme, credentials);
		}
		this.cache = new Cache(this.baseURI);
	};
	var es = EntryStore.prototype; //Shortcut, avoids having to write EntryStore.prototype everywhere below when defining methods.
	
	es.auth = function(authScheme, credentials) {
		rest.auth(authScheme, credentials);
		cache.invalidateCache();
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
		var e = this.cache.get(entryURI);
		if (e) {
			return e.refresh(); //Will only refresh if needed, a promise is returned in any case
		} else {
			var d = new Deferred();
			rest.get(rest.getEntryLoadURI(entryURI, optionalLoadParams)).then(function(data) {
				cache.cacheAll(Entry.createListChildren(data));
				var e = Entry.create(entryURI, data);
				cache.cache(e);
				d.resolve(e);
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
		this.getEntry(this.baseURI+"_principals/entry/_all", optionalPagingParams).then(function(entry) {
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
	 * @param contextEntry an entry for the context where the new entry should be created. Mandatory.
	 * @param prototypeEntry a fake entry that acts as a prototype, i.e. containing characteristics of the to be created entry. Optional.
	 * @param parentListEntry an entry corresponding to a list to which the entry should be added as a child.    
	 */
	es.createEntry = function(contextEntry, prototypeEntry, parentListEntry) {
		var d = new Deferred();
		rest.post(
				rest.getEntryCreateURI(contextEntry, prototypeEntry, parentListEntry),
				rest.getEntryCreatePostData(prototypeEntry)).then(function(location) { //Success, a new created entry exists
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
		this.cache.addCacheUpdateListener(listener);
	};
	es.removeCacheUpdateListener = function(listener) {
		this.cache.removeCacheUpdateListener (listener);		
	};
	es.invalidateCache = function() {
		this.cache.invalidateCache();
	};
	
	es.version = function() {
		//TODO
	};

	es.status = function() {
		//TODO admin only
	};
	
	// TODO user and group handling (get/add/update/remove)
	return es;
});
