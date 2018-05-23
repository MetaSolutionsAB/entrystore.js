import { isBrowser } from './utils';

  import { Resource } from './Resource';
  import { factory } from './factory';

  /**
   * File resources are resources located in the Entrystore repository that have a graph type of
   * none, e.g. none of the special cases for which there are special treatment in EntryStore.
   *
   * @exports store/File
   */
  const FileResource = class extends Resource {
    /**
     * Pushes a file to the server for this resource.
     * In a browser environment a file is represented via an input tag which references
     * the file to be uploaded via its value attribute. E.g.:
     *
     *       <input type="file" name="uploadFile"/>
     *
     * During the uploading process the input tag will be moved temporarily in the DOM tree,
     * it will be restored to its original position afterwards (both upon success and failure).
     *
     * In a nodejs environments the file is leveraged as a stream, i.e.:
     * res.putFile(fs.createReadStream('file.txt'));
     *
     * @param {node|fileHandle} data - input tag or file handle that corresponds to a file.
     * @param {text} format - indicates the mimetype of the data
     * @todo fix-if-modified-since
     * @returns {xhrPromise}
     */
    putFile(data, format) {
      let url;
      // noinspection AmdModulesDependencies
      if (isBrowser() && data instanceof Node) {
        if (data.name == null || data.name === '') {
          throw new Error('Failure, cannot upload resource from input element unless a name' +
            ' attribute is provided.');
        }
        url = factory.getPutFileURI(this.getResourceURI());
      } else {
        url = this.getResourceURI();
      }
      const es = this.getEntryStore();
      return es.handleAsync(es.getREST().putFile(url, data, format).then((res) => {
        this.getEntry(true).setRefreshNeeded();
        return res;
      }), 'putFile');
    }

    /**
     * Pushes data to the server for this resource.
     *
     * @param {string} data - to be stored as a file.
     * @param {string} format - the format of the data as a mimetype.
     * @returns {xhrPromise}
     */
    put(data, format) {
      const es = this.getEntryStore();
      return es.handleAsync(es.getREST().put(this.getResourceURI(), data, null, format), 'putFile');
    }

    /**
     * Pushes text content to the server for this resource.
     *
     * @param {string} text - to be stored as a file, format will be set to text/plain.
     * @returns {xhrPromise}
     */
    putText(text) {
      return this.put(text, 'text/plain');
    }

    /**
     * Pushes JSON content to the server for this resource.
     *
     * @param {Object} obj - to be stored as a json object, format will be set to application/json.
     * @returns {xhrPromise}
     */
    putJSON(obj) {
      return this.put(JSON.stringify(obj));
    }

    /**
     * Pushes xml content to the server for this resource.
     *
     * @param {string|Document} xml - to be stored as a xml object, format will be set to
     * application/json.
     * @returns {xhrPromise}
     * @todo not finished or tested
     */
    putXML(xml) {
      let _xml = xml;
      if (isBrowser() && _xml instanceof Document) {
        try {
          // Gecko- and Webkit-based browsers (Firefox, Chrome), Opera.
          _xml = (new XMLSerializer()).serializeToString(_xml);
        } catch (e) {
          try {
            // Internet Explorer.
            _xml = _xml.xml;
          } catch (ee) {
            throw new Error('Xmlserializer not supported');
          }
        }
      } else if ((typeof _xml) !== "string") {
        throw new Error('Unsupported format of parameter xml to method putAsXML');
      }
      return this.put(_xml, 'text/xml');
    }

    /**
     * @returns {xhrPromise} which format the resource is returned in the promise (string, json or
     * xml) depends on what is specified in the mimetype. Xml is only returned in a browser
     * environment, if not in a browser a string is returned.
     */
    get() {
      const format = this.getEntry(true).getEntryInfo().getFormat();
      const es = this.getEntryStore();
      return es.handleAsync(es.getREST().get(this.getResourceURI(), format), 'getFile');
    }

    /**
     * @returns {xhrPromise} ignores what is specified in the mimetype and returns the resource
     * as a string in the promise.
     */
    getText() {
      const es = this.getEntryStore();

      return es.handleAsync(this.getEntryStore().getREST().get(this.getResourceURI(), 'text/plain'), 'getFile');
    }

    /**
     * @returns {xhrPromise} ignores what is specified in the mimetype and returns the resource
     * as a javascript object in the promise.
     */
    getJSON() {
      const es = this.getEntryStore();
      return es.handleAsync(es.getREST().get(this.getResourceURI(), 'application/json'), 'getFile');
    }

    /**
     * @returns {xhrPromise} ignores what is specified in the mimetype and returns the resource
     * in the promise as a XML Document or a string (depending on if you are in browser or not).
     */
    getXML() {
      const es = this.getEntryStore();
      return es.handleAsync(es.getREST().get(this.getResourceURI(), 'text/xml'), 'getFile');
    }
  };

  export { FileResource };
