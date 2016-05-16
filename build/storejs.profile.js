var profile = (function(){
	return {
        basePath: '../libs/',
        releaseDir: '../release',
        action: 'release',
        platform: 'browser',
        mini: true,
//        optimize: 'closure',
        stripConsole: 'all',
        selectorEngine: 'acme',
	    layerOptimize: "closure",

        packages:[
            "dojo",
            "rdfjson",
            {name: "md5", location: "md5/js", main: "md5.min"},
            {name:"store", location:".."}
        ],
	    	    

        staticHasFeatures:{
            'config-dojo-loader-catches': 0,
            'config-tlmSiblingOfDojo': 0,
            'dojo-log-api': 0,
            'dojo-sync-loader': 0,
            'dojo-timeout-api': 0,
            //			'dojo-sniff': 0,
            'dojo-cdn': 0,
            'dojo-loader-eval-hint-url': 1,
            'config-stripStrict': 0,
            'ie-event-behavior': 0
            //			'dojo-config-api': 0
        },

	    layers: {
            "dojo/dojo": {
                include: ["store/EntryStore", "store/solr", "rdfjson/Graph", "dojo/_base/window", "dojo/request/iframe", "dojo/request/xhr", "dojo/domReady", "dojo/promise/all"],
                customBase: true,
                boot: true
            }
        }
	};
})();