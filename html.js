/*global define,rdfjson*/
define([
    'exports',
    'rdfjson/print'
], function (
    exports,
    print) {

    /**
     * A module that contain utility methods for generating html for entries.
     *
     * @exports store/html
     * @namespace
     */
    var html = exports; //This construction seem to be needed because of jsdoc3 issues with not detecting the exports variable.

    /**
     * Generates a table with columns subject, predicate, and object.
     * @param {store/Entry} entry to expose metadata for
     * @returns {string} rendered html as a string
     */
    html.metadataTable = function(entry) {
        var delegates = print.prettyTree(entry.getMetadata(), entry.getResourceURI());
        var arr = [];
        for (var i=0;i<delegates.length;i++) {
            var d = delegates[i], st = d.stmt;
            arr.push("<tr>"+
                "<td class='rdf_subject'>"+(st.isSubjectBlank() ? d.s : "<a href='"+st.getSubject()+"'>"+d.s+"</a>")+"</td>"+
                "<td class='rdf_predicate'><a href='"+st.getPredicate()+"'>"+d.p+"</a></td>"+
                "<td class='rdf_object'>"+(st.getType() === "uri" ? "<a href='"+st.getValue()+"'>"+ d.o+"</a>" : d.o) +"</td>"+
                "</tr>");
        }
        return arr.join("\n");
    };

    var _ind = {};
    var indenter = function(indent) {
        if (!_ind[indent]) {
            var str = "";
            for (var i=1;i<indent;i++) {
                str += "<span class='rdf_indent'></span>"
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
    html.metadataIndent = function(graph, subject) {
        var delegates = print.prettyTree(graph, subject);
        var arr = [];
        for (var i=0;i<delegates.length;i++) {
            var d = delegates[i], st = d.stmt;
            arr.push("<div class='rdf_statement'>"+indenter(d.indent)+
                "<span class='rdf_subject'>"+(st.isSubjectBlank() ? d.s : "<a href='"+st.getSubject()+"'>"+d.s+"</a>")+"</span>"+
                "<span class='rdf_predicate'><a href='"+st.getPredicate()+"'>"+d.p+"</a></span>"+
                "<span class='rdf_object'>"+(st.getType() === "uri" ? "<a href='"+st.getValue()+"'>"+ d.o+"</a>" : d.o) +"</span></div>");
        }
        return arr.join("\n");
    };

    /**
     * Prints the three types of the entry, i.e. entry, resource and graphtype.
     * @param {store/EntryInfo} entryInfo
     * @returns {string}
     */
    html.entryInfo = function(entryInfo) {
        return "<span class='info entrytype'><label>EntryType:</label> "+ entryInfo.getEntryType() + "</span>" +
            "<span class='info resourceType'><label>ResourceType:</label> "+entryInfo.getResourceType()+"</span>" +
            "<span class='info graphType'><label>GraphType:</label> "+entryInfo.getGraphType()+"</span>";
    };

    /**
     * Prints information about the entry, including entryinfo, metadata, cached external meradata as well as which context
     * the entry belongs to.
     *
     * @param {store/Entry} entry
     * @returns {string} information about the entry as a HTML string.
     */
    html.print = function(entry) {
        var strs = ["<div class='entry'>" +
            "<h3>Context: <a class='contextURI' href='"+entry.getContext().getOwnEntryURI()+"'>"+entry.getContext().getId()+"</a> <span></span> " +
            "Entry: <a class='entryURI' href='"+entry.getURI()+"'>"+entry.getId()+"</a></h3>" +
            "<div>" +
            "<div class='entryInfo'>"+html.entryInfo(entry.getEntryInfo())+"</div>"]
        var md = entry.getMetadata();
        if (md && !md.isEmpty()) {
            strs.push("<h4>Local metadata:</h4><div class='metadata'>"+html.metadataIndent(md, entry.getResourceURI())+"</div>");
        }
        var emd = entry.getCachedExternalMetadata();
        if (emd && !emd.isEmpty()) {
            strs.push("<h4>Cached external metadata:</h4><div class='metadata'>"+html.metadataIndent(emd, entry.getResourceURI())+"</div>");
        }
        strs.push("</div></div>");
        return strs.join("");
    };
});