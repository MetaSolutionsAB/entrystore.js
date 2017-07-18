require.config({
    baseUrl: "../libs",
    paths: {
        "store": "..",
        "requireLib": "requirejs/require",
        "md5": "md5/js/md5.min",
        "config": "../config",
        "tests": "../tests"
    },
    map: {
        "store/rest": {
            //Force using xhr since we know we are in the browser
            "dojo/request": "dojo/request/xhr",
            //Override above line for paths to iframe and script.
            "dojo/request/iframe": "dojo/request/iframe",
            'dojo/request/script': 'dojo/request/script'
        }
    },
    deps: [
        "store/EntryStore",
        "dojo/_base/window",
        "dojo/request/xhr",
        "dojo/request/iframe",
        "dojo/request/script",
        "dojo/promise/all"
    ]
});