/*global define*/
define([
    "exports",
    "dojo/promise/all",
    "dojo/_base/array"
], function(exports, all, array) {

    exports.getRelatedToEntryURIs = function(fromEntry) {
        var es = fromEntry.getEntryStore();
        var base = fromEntry.getEntryStore().getBaseURI();
        var relatedEntryURIs = [];
        array.forEach(fromEntry.getMetadata().find(), function(stmt) {
            if (stmt.getType() === "uri") {
                var obj = stmt.getValue();
                if (obj.indexOf(base) === 0) {
                    var uri = es.getEntryURI(es.getContextId(obj), es.getEntryId(obj));
                    relatedEntryURIs.push(uri);
                }
            }
        });
        return relatedEntryURIs;
    };

    exports.getRelatedToEntries = function(fromEntry) {
        var es = fromEntry.getEntryStore();
        return all(array.map(exports.getRelatedToEntryURIs(fromEntry), function(uri) {
            return es.getEntry(uri);
        }));
    };

    exports.remove = function(entry) {
        var es = entry.getEntryStore();
        var cache = es.getCache();
        var refStmts =  entry.getReferrersGraph().find();
        var entryPromises = array.map(refStmts, function(stmt) {
            var subj = stmt.getSubject();
            var euri = es.getEntryURI(es.getContextId(subj), es.getEntryId(subj));
            return es.getEntry(euri);
        });
        return entry.del().then(function() {
            return all(entryPromises).then(function(arr) {
                var promises = array.map(refStmts, function(stmt, idx) {
                    var md = arr[idx].getMetadata();
                    md.remove(stmt);
                    return arr[idx].commitMetadata();
                });
                var uris = exports.getRelatedToEntryURIs(entry);
                array.forEach(uris, function(uri) {
                    var e = cache.get(uri);
                    if (e != null) {
                        e.setRefreshNeeded();
                        promises.push(e.refresh());
                    }
                });
                return all(promises);
            });
        });
    };

    exports.addRelation = function(fromEntry, property, toEntry) {
        fromEntry.getMetadata().add(fromEntry.getResourceURI(), property, toEntry.getResourceURI());
        return fromEntry.commitMetadata().then(function() {
            toEntry.setRefreshNeeded();
            return toEntry.refresh();
        });
    };

    exports.removeRelation = function(fromEntry, property, toEntry) {
        fromEntry.getMetadata().remove(fromEntry.getResourceURI(), property, {type: "uri", value: toEntry.getResourceURI()});
        return fromEntry.commitMetadata().then(function() {
            toEntry.setRefreshNeeded();
            return toEntry.refresh();
        });
    };

    return exports;
});