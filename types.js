/*global define*/
define({
	ET: { //EntryType
        LOCAL: "Local",
        LINK: "Link",
        LINKREF: "Linkreference",
        REF: "Reference",
        DEFAULT: "Local"   //The default option
    },
    GT: { //GraphType
        NONE: "None",
        CONTEXT: "Context",
        SYSTEMCONTEXT: "Systemcontext",
        USER: "User",
        GROUP: "Group",
        LIST: "List",
        RESULTLIST: "Resultlist",
        GRAPH: "Graph",
        STRING: "String",
        PIPELINE: "Pipeline",
        DEFAULT: "None"//The default option
    },

    RT: { //ResourceType
        INFORMATIONRESOURCE: "Information",
        RESOLVABLEINFORMATIONRESOURCE: "Resolvable",
        NAMEDRESOURCE: "Named",
        UNKNOWN: "Unknown",
        DEFAULT: "Information" //The default option
    }
});