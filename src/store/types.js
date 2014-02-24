/*global define*/
define({
	ET: { //EntryType
        LOCAL: "local",
        LINK: "link",
        LINKREF: "linkreference",
        REF: "reference",
        default: "local"   //The default option
    },
    GT: { //GraphType
        NONE: "none",
        CONTEXT: "context",
        SYSTEMCONTEXT: "systemcontext",
        USER: "user",
        GROUP: "group",
        LIST: "list",
        RESULTLIST: "resultlist",
        GRAPH: "graph",
        STRING: "string",
        PIPELINE: "pipeline",
        default: "none"//The default option
    },

    RT: { //ResourceType
        INFORMATIONRESOURCE: "information",
        RESOLVABLEINFORMATIONRESOURCE: "resolvable",
        NAMEDRESOURCE: "named",
        UNKNOWN: "unknown",
        default: "information" //The default option
    }
});