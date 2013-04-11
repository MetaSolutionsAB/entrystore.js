/*global define*/
define([], function() {
	
	var ns = "http://scam.sf.net/schema#";
	var rdfns = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
		
	var et = {};
	et[ns+"Local"] = "local";
	et[ns+"Link"] = "link";
	et[ns+"LinkReference"] = "linkreference";
	et[ns+"Reference"] = "reference";
	et["default"] = "local";   //The default option
	
	var gt = {};
	gt[ns+"None"] = "none";
	gt[ns+"Context"] = "context";
	gt[ns+"SystemContext"] = "systemcontext";
	gt[ns+"User"] = "user";
	gt[ns+"Group"] = "group";
	gt[ns+"List"] = "list";
	gt[ns+"ResultList"] = "resultlist";
	gt[ns+"Graph"] = "graph";
	gt[ns+"String"] = "string";
	gt["default"] = "none"; //The default option
	
	var rt = {};
	rt[ns+"InformationResource"] = "information";
	rt[ns+"ResolvableInformationResource"] = "resolvable";
	rt[ns+"NamedResource"] = "named";
	rt[ns+"Unknown"] = "unknown";
	rt["default"] = "information"; //The default option
	
	var inv = function(obj) {
		var iobj = {};
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				iobj[obj[key]] = key;
			}
		}
		return iobj;
	};
	
	return {
		resource: ns + "resource",
		metadata: ns + "metadata",
		entryType: et,
		invEntryType: inv(et),
		graphType: gt,
		invGraphType: inv(gt),
		resourceType: rt,
		invResourceType: inv(rt),
		rdf: {
			type: rdfns+"type"
		}
	};
});