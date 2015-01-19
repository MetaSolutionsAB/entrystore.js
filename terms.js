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
	et[ns+"Local"] = types.ET_LOCAL;
	et[ns+"Link"] = types.ET_LINK;
	et[ns+"LinkReference"] = types.ET_LINKREF;
	et[ns+"Reference"] = types.ET_REF;
	et["default"] = types.ET_LOCAL;   //The default option
    externals.entryType = et;
    externals.invEntryType = inv(et);

    //GraphType
    var gt = {};
	gt[ns+"None"] = types.GT_NONE;
	gt[ns+"Context"] = types.GT_CONTEXT;
	gt[ns+"SystemContext"] = types.GT_SYSTEMCONTEXT;
	gt[ns+"User"] = types.GT_USER;
	gt[ns+"Group"] = types.GT_GROUP;
	gt[ns+"List"] = types.GT_LIST;
	gt[ns+"ResultList"] = types.GT_RESULTLIST;
	gt[ns+"Graph"] = types.GT_GRAPH;
	gt[ns+"String"] = types.GT_STRING;
	gt["default"] = types.GT_NONE; //The default option
    externals.graphType = gt;
    externals.invGraphType = inv(gt);

    //ResourceType
	var rt = {};
	rt[ns+"InformationResource"] = types.RT_INFORMATIONRESOURCE;
	rt[ns+"ResolvableInformationResource"] = types.RT_RESOLVABLEINFORMATIONRESOURCE;
	rt[ns+"NamedResource"] = types.RT_NAMEDRESOURCE;
	rt[ns+"Unknown"] = types.RT_UNKNOWN;
	rt["default"] = types.RT_INFORMATIONRESOURCE; //The default option
    externals.resourceType = rt;
    externals.invResourceType = inv(rt);

    externals.acl = {
        read: ns + "read",
        write: ns + "write"
    };

	return externals;
});