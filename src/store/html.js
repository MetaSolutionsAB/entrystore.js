/*global define,rdfjson*/
define([
    'exports',
    'rdfjson/print'
], function (exports, rdfprint) {


    exports.metadataTable = function(entry) {
        var delegates = rdfprint.prettyTree(entry.getMetadata(), entry.getResourceURI());
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

    exports.metadataIndent = function(graph, subject) {
        var delegates = rdfprint.prettyTree(graph, subject);
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

    exports.entryInfo = function(entryInfo) {
        return "<span class='info entrytype'><label>EntryType:</label> "+ entryInfo.getEntryType() + "</span>" +
            "<span class='info resourceType'><label>ResourceType:</label> "+entryInfo.getResourceType()+"</span>" +
            "<span class='info graphType'><label>GraphType:</label> "+entryInfo.getGraphType()+"</span>";
    };
    exports.print = function(entry) {
        var strs = ["<div class='entry'>" +
            "<h3>Context: <a class='contextURI' href='"+entry.getContext().getOwnEntryURI()+"'>"+entry.getContext().getId()+"</a> <span></span> " +
            "Entry: <a class='entryURI' href='"+entry.getURI()+"'>"+entry.getId()+"</a></h3>" +
            "<div>" +
            "<div class='entryInfo'>"+exports.entryInfo(entry.getEntryInfo())+"</div>"]
        var md = entry.getMetadata();
        if (md && !md.isEmpty()) {
            strs.push("<h4>Local metadata:</h4><div class='metadata'>"+exports.metadataIndent(md, entry.getResourceURI())+"</div>");
        }
        var emd = entry.getCachedExternalMetadata();
        if (emd && !emd.isEmpty()) {
            strs.push("<h4>Cached external metadata:</h4><div class='metadata'>"+exports.metadataIndent(emd, entry.getResourceURI())+"</div>");
        }
        strs.push("</div></div>");
        return strs.join("");
    };
});