var profile = (function(){
	return {
        action: 'release',
        platform: 'browser',
        mini: true,
//        optimize: 'closure',
        stripConsole: 'all',
        selectorEngine: 'acme',
	    layerOptimize: "closure",
	    basePath: '../src/',
	    releaseDir: "../release",
	    
        packages:[
            {name:"dojo", location:"../lib/dojo-src/dojo"},
            "store",
            "rdfjson"
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
                include: ["store/EntryStore", "rdfjson/Graph", "dojo/_base/window", "dojo/request/iframe", "dojo/request/xhr"],
                customBase: true,
                boot: true
            }
        }
	};
})();