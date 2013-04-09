var profile = (function(){
	return {
	    action: 'release',
		layerOptimize: "closure",
		basePath: '../src/',
		releaseDir: "../release",
 
		packages:[
			{name:"dojo", location:"../lib/dojo-src/dojo"},
			"store"
		],
 
		defaultConfig:{
			hasCache:{
				'dojo-built': 1,
				'dojo-loader': 1,
				'dom': 1,
				'host-browser': 1,
				"config-selectorEngine": "lite"
			},
			async:1
		},
 
		dojoBootText:"require.boot && require.apply(null, require.boot);",
 
		staticHasFeatures:{
			'config-dojo-loader-catches': 0,
			'config-tlmSiblingOfDojo': 0,
			'dojo-log-api': 0,
			'dojo-sync-loader': 0,
			'dojo-timeout-api': 0,
			'dojo-sniff': 0,
			'dojo-cdn': 0,
			'dojo-loader-eval-hint-url': 1,
			'config-stripStrict': 0,
			'ie-event-behavior': 0,
			'dojo-config-api': 0
		},
 
		layers: {
			"dojo/dojo": {
				include: ["store/EntryStore"],
				customBase: 1
			}
		}
	};
})();