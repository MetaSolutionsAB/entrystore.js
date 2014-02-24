/*global define*/
define(["store/types"], function(types) {

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
    var ns = "http://entrystore.org/terms/";
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
	et[ns+"Local"] = types.ET.LOCAL;
	et[ns+"Link"] = types.ET.LINK;
	et[ns+"LinkReference"] = types.ET.LINKREF;
	et[ns+"Reference"] = types.ET.REF;
	et["default"] = types.ET.DEFAULT;   //The default option
    externals.entryType = et;
    externals.invEntryType = inv(et);

    //GraphType
    var gt = {};
	gt[ns+"None"] = types.GT.NONE;
	gt[ns+"Context"] = types.GT.CONTEXT;
	gt[ns+"SystemContext"] = types.GT.SYSTEMCONTEXT;
	gt[ns+"User"] = types.GT.USER;
	gt[ns+"Group"] = types.GT.GROUP;
	gt[ns+"List"] = types.GT.LIST;
	gt[ns+"ResultList"] = types.GT.RESULTLIST;
	gt[ns+"Graph"] = types.GT.GRAPH;
	gt[ns+"String"] = types.GT.STRING;
	gt["default"] = types.GT.DEFAULT; //The default option
    externals.graphType = gt;
    externals.invGraphType = inv(gt);

    //ResourceType
	var rt = {};
	rt[ns+"InformationResource"] = types.RT.INFORMATION;
	rt[ns+"ResolvableInformationResource"] = types.RT.RESOLVABLE;
	rt[ns+"NamedResource"] = types.RT.NAMED;
	rt[ns+"Unknown"] = types.RT.UNKNOWN;
	rt["default"] = types.RT.DEFAULT; //The default option
    externals.resourceType = rt;
    externals.invResourceType = inv(rt);

	return externals;
});