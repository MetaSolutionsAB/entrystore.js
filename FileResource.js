/*global define*/
define([
    "dojo/json",
    "dojo/has",
    "dojo/_base/lang",
    "store/Resource"
], function(json, has, lang, Resource) {
	
	/**
     * File resources are resources located in the Entrystore repository that have a graph type of none, e.g. none
     * of the special cases for which there are special treatment in EntryStore.
     *
     * @exports store/FileResource
     * @param {string} entryURI - URI to an entry where this resource is contained.
     * @param {string} resourceURI - URI to the resource.
     * @param {store/EntryStore} entryStore - the API's repository instance.
	 * @class
     * @extends store/Resource
	 */
	var File = function(entryURI, resourceURI, entryStore) {
        Resource.apply(this, arguments); //Call the super constructor.
	};
    //Inheritance trick
    var F = function() {};
    F.prototype = Resource.prototype;
    File.prototype = new F();

    /**
     * Pushes a file to the server for this resource.
     * In a browser environment a file is represented via an input tag which references
     * the file to be uploaded via its value attribute. E.g.:
     *
     *       <input type="file" name="uploadFile"/>
     *
     * During the uploading process the input tag will be moved temporarily in the DOM tree, it will be
     * restored to its original position afterwards (both upon success and failure).
     *
     * In non-browser environments the file is typically represented as a file handle.
     *
     * @param {node|fileHandle} data - input tag or file handle that corresponds to a file, .
     * @todo implement in non-browser environment and for xml.
     * @todo fix-if-modified-since
     * @todo fix xml
     * @returns {xhrPromise}
     */
    File.prototype.putFile = function(data) {
        return lang.hitch(this, function() {
            if (has("host-browser") && data instanceof Node) {
                if (data.name == null || data.name === "") {
                    throw "Failure, cannot upload resource from input element unless a name attribute is provided.";
                }
                return this.getEntryStore().getREST().putFile(this.getResourceURI(), data);
            } else {
                //TODO file handle
            }
        })().then(lang.hitch(this, function(res) {
            this.getEntry(true).setRefreshNeeded();
            return res;
        }));
    };

    /**
     * Pushes data to the server for this resource.
     *
     * @param {string} data - to be stored as a file.
     * @param {string} format - the format of the data as a mimetype.
     * @returns {xhrPromise}
     */
    File.prototype.put = function(data, format) {
        return this.getEntryStore().getREST().put(this.getResourceURI(), data, null, format)
            .then(lang.hitch(this, function(res) {
                this.getEntry(true).setRefreshNeeded();
                return res;
            }));
    };

    /**
     * Pushes text content to the server for this resource.
     *
     * @param {string} text - to be stored as a file, format will be set to text/plain.
     * @returns {xhrPromise}
     */
    File.prototype.putText = function(text) {
        return this.put(text, "text/plain");
    };

    /**
     * Pushes JSON content to the server for this resource.
     *
     * @param {Object} obj - to be stored as a json object, format will be set to application/json.
     * @returns {xhrPromise}
     */
    File.prototype.putJSON = function(obj) {
        return this.put(json.stringify(obj));
    };

    /**
     * Pushes xml content to the server for this resource.
     *
     * @param {string|Document} xml - to be stored as a xml object, format will be set to application/json.
     * @returns {xhrPromise}
     * @todo not finished or tested
     */
    File.prototype.putXML = function(xml) {
       if (has("host-browser") && xml instanceof Document) {
            try {
                // Gecko- and Webkit-based browsers (Firefox, Chrome), Opera.
                xml = (new XMLSerializer()).serializeToString(xml);
            } catch (e) {
                try {
                    // Internet Explorer.
                    xml = xml.xml;
                } catch (e) {
                    throw 'Xmlserializer not supported';
                }
            }
        } else if (!lang.isString(xml)) {
            throw "Unsupported format of parameter xml to method putAsXML";
        }
        return this.put(xml, "text/xml");
    };

    /**
     * @returns {xhrPromise} which format the resource is returned in the promise (string, json or xml)
     * depends on what is specified in the mimetype. Xml is only returned in a browser environment, if not in a browser
     * a string is returned.
     */
    File.prototype.get = function(direct) {
        var format = this.getEntry(true).getEntryInfo().getFormat();
        return this.getEntryStore().getREST().get(this.getResourceURI(), format);
    };

    /**
     * @returns {xhrPromise} ignores what is specified in the mimetype and returns the resource
     * as a string in the promise.
     */
    File.prototype.getText = function() {
        return this.getEntryStore().getREST().get(this.getResourceURI(), "text/plain");
    };

    /**
     * @returns {xhrPromise} ignores what is specified in the mimetype and returns the resource
     * as a javascript object in the promise.
     */
    File.prototype.getJSON = function() {
        return this.getEntryStore().getREST().get(this.getResourceURI(), "application/json");
    };

    /**
     * @returns {xhrPromise} ignores what is specified in the mimetype and returns the resource
     * in the promise as a XML Document or a string (depending on if you are in browser or not).
     */
    File.prototype.getXML = function() {
        return this.getEntryStore().getREST().get(this.getResourceURI(), "text/xml");
    };

    return File;
});