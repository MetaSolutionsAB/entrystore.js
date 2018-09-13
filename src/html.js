const print = require('rdfjson/print');

  /**
   * A module that contain utility methods for generating html for entries.
   *
   * @exports store/html
   * @namespace
   */
  const html = {};
  // The above construction seem to be needed because of jsdoc3 issues with not detecting the
  // exports variable.

  /**
   * Generates a table with columns subject, predicate, and object.
   * @param {store/Entry} entry to expose metadata for
   * @returns {string} rendered html as a string
   */
  html.metadataTable = (entry) => {
    const delegates = print.prettyTree(entry.getMetadata(), entry.getResourceURI());
    const arr = [];
    for (let i = 0; i < delegates.length; i++) {
      const d = delegates[i];
      const st = d.stmt;
      arr.push(`${'<tr>' +
        "<td class='rdf_subject'>"}${st.isSubjectBlank() ? d.s :
          `<a href='${st.getSubject()}'>${d.s}</a>`}</td>` +
        `<td class='rdf_predicate'><a href='${st.getPredicate()}'>${d.p}</a></td>` +
        `<td class='rdf_object'>${st.getType() === 'uri' ? `<a href='${st.getValue()}'>${d.o}</a>` :
          d.o}</td></tr>`);
    }
    return arr.join('\n');
  };

  const _ind = {};
  const indenter = function (indent) {
    if (!_ind[indent]) {
      let str = '';
      for (let i = 1; i < indent; i++) {
        str += "<span class='rdf_indent'></span>";
      }
      _ind[indent] = str;
    }
    return _ind[indent];
  };

  /**
   * Prints one level of triples from a subject where URIs are namespaced.
   *
   * @param {rdfjson/Graph} graph the graph containing the metadata
   * @param {string} subject URI to a resource to start from
   * @returns {string} string with the triples rendered as HTML.
   */
  html.metadataIndent = function (graph, subject) {
    const delegates = print.prettyTree(graph, subject);
    const arr = [];
    for (let i = 0; i < delegates.length; i++) {
      const d = delegates[i];
      const st = d.stmt;
      arr.push(`<div class='rdf_statement'>${indenter(d.indent)}<span class='rdf_subject'>${
          st.isSubjectBlank() ? d.s : `<a href='${st.getSubject()}'>${d.s}</a>`}</span>` +
        `<span class='rdf_predicate'><a href='${st.getPredicate()}'>${d.p}</a></span>` +
        `<span class='rdf_object'>${st.getType() === 'uri' ?
          `<a href='${st.getValue()}'>${d.o}</a>` : d.o}</span></div>`);
    }
    return arr.join('\n');
  };

  /**
   * Prints the three types of the entry, i.e. entry, resource and graphtype.
   * @param {store/EntryInfo} entryInfo
   * @returns {string}
   */
  html.entryInfo = entryInfo =>
  `<span class='info entrytype'><label>EntryType:</label> ${entryInfo.getEntryType()}</span>` +
  `<span class='info resourceType'><label>ResourceType:</label> ${entryInfo.getResourceType()
  }</span>` +
  `<span class='info graphType'><label>GraphType:</label> ${entryInfo.getGraphType()}</span>`;

  /**
   * Prints information about the entry, including entryinfo, metadata, cached external metadata
   * as well as which context the entry belongs to.
   *
   * @param {store/Entry} entry
   * @returns {string} information about the entry as a HTML string.
   */
  html.print = (entry) => {
    const strs = [`${"<div class='entry'>" +
    "<h3>Context: <a class='contextURI' href='"}${entry.getContext().getEntryURI()}'>${entry.getContext().getId()}</a> <span></span> ` +
    `Entry: <a class='entryURI' href='${entry.getURI()}'>${entry.getId()}</a></h3>` +
    '<div>' +
    `<div class='entryInfo'>${html.entryInfo(entry.getEntryInfo())}</div>`];
    const md = entry.getMetadata();
    if (md && !md.isEmpty()) {
      strs.push(`<h4>Local metadata:</h4><div class='metadata'>${html.metadataIndent(md, entry.getResourceURI())}</div>`);
    }
    const emd = entry.getCachedExternalMetadata();
    if (emd && !emd.isEmpty()) {
      strs.push(`<h4>Cached external metadata:</h4><div class='metadata'>${html.metadataIndent(emd, entry.getResourceURI())}</div>`);
    }
    strs.push('</div></div>');
    return strs.join('');
  };

  export default html;
