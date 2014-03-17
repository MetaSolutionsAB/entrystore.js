/*global define,rdfjson*/
define([
    'dojo/_base/array',
    'dojo/_base/window',
    'dojo/dom-attr',
    'dojo/dom-construct',
    'dojo/json',
    'dojo/query',
    'store/EntryStore',
    'store/factory',
    'store/html',
    'dojo/domReady!'
], function (array, win, attr, construct, json, query, EntryStore, factory, html) {
    var entryURI = window._entryURI || window.location.href;
    if (entryURI.indexOf("?") !== -1) {
        entryURI = entryURI.substr(0, entryURI.indexOf("?"));
    }
    var node = construct.create("div", null, win.body(), "first");
    var es = new EntryStore(window._storeURI);
    var onSuccess = function(entry) {
        construct.create("h1", {"innerHTML": "Entry: "+entryURI}, node);
        construct.place(html.print(entry), node);

        if (entry.isList()) {
            construct.create("h2", {"innerHTML": "Entry is a list, children below:"}, node);
            //Children
            var list = entry.getResource();
            list.setLimit(38);
            list.getEntries().then(function(children) {  //TODO handle errors
                construct.create("h3", {"innerHTML": "List loaded with "+children.length+" children."}, node);
                array.forEach(children, function(child) {
                    construct.place(html.print(child), node);
                });
            });
        }
    };

    var nl = query("textarea");
    if (nl.length > 0) {
        var data = attr.get(nl[0], "value");
        data = json.parse(data);
        onSuccess(factory.updateOrCreate(entryURI, data, es));
    } else {
        es.getEntry(entryURI).then(onSuccess); //TODO handle errors.
    }
});