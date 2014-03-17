/*global define*/
define({
	ET: { //EntryType
        LOCAL: "local",
        LINK: "link",
        LINKREF: "linkreference",
        REF: "reference",
        DEFAULT: "local"   //The default option
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
        DEFAULT: "none"//The default option
    },

    RT: { //ResourceType
        INFORMATIONRESOURCE: "information",
        RESOLVABLEINFORMATIONRESOURCE: "resolvable",
        NAMEDRESOURCE: "named",
        UNKNOWN: "unknown",
        DEFAULT: "information" //The default option
    }
});