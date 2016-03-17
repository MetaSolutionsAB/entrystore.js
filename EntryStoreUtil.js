/*global define*/

define([
    "dojo/_base/lang",
    "dojo/Deferred",
    "store/solr"
], function (lang, Deferred, solr) {

    /**
     * EntryStoreUtil provides utility functionality for working with entries.
     * @exports store/EntryStoreUtil
     * @class
     */
    var EntryStoreUtil = function (entrystore) {
        this._entrystore = entrystore;
        this._preloadIdx = {};
    };

    /**
     * Preload entries of a specific type.
     * Not strictly needed, used for optimization reasons.
     * Up to a maximum of 100 entries are preloaded.
     *
     * @param {string} typeURI
     * @param {store/context} inContext if provided limits the preload to a specific context.
     * @returns {store/Entry}
     */
    EntryStoreUtil.prototype.preloadEntries = function(ofType, inContext) {
        var preloadForType = this._preloadIdx[ofType];
        if (preloadForType) {
            if (inContext) {
                var promise = preloadForType[inContext.getEntryURI()];
                if (promise) {
                    return promise;
                }
            } else if (preloadForType.noContext) {
                return preloadForType.noContext;
            }
        } else {
            preloadForType = this._preloadIdx[ofType] = {};
        }

        var searchObj = solr.resourceType(ofType).limit(100);
        if (inContext) {
            searchObj.context(inContext);
        }
        var list = this._entrystore.createSearchList(searchObj);
        var promise = list.getEntries(0);
        if (inContext) {
            preloadForType[inContext.getEntryURI()] = promise;
        } else {
            preloadForType.noContext = promise;
        }
        return promise;
    };

    EntryStoreUtil.prototype.clearPreloadEntriesDuplicateCheck = function(ofType, inContext) {
        if (ofType) {
            var preloadForType = this._preloadIdx[ofType];
            if (preloadForType && inContext) {
                delete preloadForType[inContext.getEntryURI()];
            } else {
                delete this._preloadIdx[ofType];
            }
        } else {
            this._preloadIdx = {};
        }
    };

    /**
     * Retrieves an entry for a resource URI, note that if there are several entries that all
     * have the same resource URI it is unclear which of these entries that are returned.
     * Hence, only use this function if you expect there to be a single entry per resource URI.
     *
     * @param {string} resourceURI is the URI for the resource.
     * @param {store/Context} context an optional requirement to only look for resources in a specific context.
     * @returns {entryPromise}
     */
    EntryStoreUtil.prototype.getEntryByResourceURI = function(resourceURI, context) {
        var cache = this._entrystore.getCache();
        var entryArr = cache.getByResourceURI(resourceURI);
        for (var i=0;i<entryArr.length;i++) {
            if (context == null || entryArr[i].getContext() === context) {
                var d = new Deferred();
                d.resolve(entryArr[i]);
                return d;
            }
        }
        var searchObj = solr.resource(resourceURI).limit(1);
        if (context != null) {
            searchObj.context(context);
        }
        var list = this._entrystore.createSearchList(searchObj);
        return list.getEntries(0).then(function(arr) {
            if (arr.length > 0) {
                return arr[0];
            } else {
                throw "No entries for resource with URI: "+resourceURI;
            }
        });
    };

    /**
     * @param {string} resourceURI is the URI for the resource.
     * @returns {store/Entry}
     */
    EntryStoreUtil.prototype.getEntryListByResourceURI = function(resourceURI) {
        return this._entrystore.createSearchList(solr.resource(resourceURI));
    };


    return EntryStoreUtil;
});