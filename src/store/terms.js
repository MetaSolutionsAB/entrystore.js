/*global define*/
define([], function() {

    var inv = function(obj) {
        var iobj = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                iobj[obj[key]] = key;
            }
        }
        return iobj;
    };

    //Namespaces
    var ns = "http://scam.sf.net/schema#";
    var rdfns = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

    var externals = {
        resource: ns + "resource",
        metadata: ns + "metadata",
        externalMetadata: ns + "externalMetadata",
        rdf: {
            type: rdfns+"type"
        }
    };

    //EntryType
	var et = {};
	et[ns+"Local"] = "local";
	et[ns+"Link"] = "link";
	et[ns+"LinkReference"] = "linkreference";
	et[ns+"Reference"] = "reference";
	et["default"] = "local";   //The default option
    externals.entryType = et;
    externals.invEntryType = inv(et);

    //GraphType
    var gt = {};
	gt[ns+"None"] = "none";
	gt[ns+"Context"] = "context";
	gt[ns+"SystemContext"] = "systemcontext";
	gt[ns+"User"] = "user";
	gt[ns+"Group"] = "group";
	gt[ns+"List"] = "list";
	gt[ns+"ResultList"] = "resultlist";
	gt["http://www.w3.org/2004/03/trix/rdfg-1/Graph"] = "graph";
	gt[ns+"String"] = "string";
	gt["default"] = "none"; //The default option
    externals.graphType = gt;
    externals.invGraphType = inv(gt);

    //ResourceType
	var rt = {};
	rt[ns+"InformationResource"] = "information";
	rt[ns+"ResolvableInformationResource"] = "resolvable";
	rt[ns+"NamedResource"] = "named";
	rt[ns+"Unknown"] = "unknown";
	rt["default"] = "information"; //The default option
    externals.resourceType = rt;
    externals.invResourceType = inv(rt);

	return externals;
});