require.config({
    paths: {
        "store": "..",
        "requireLib": "requirejs/require",
        "md5": "md5/js/md5.min",
        "config": "../config",
        "tests": "../tests"
    },
    map: {
        "store/rest": {
            "dojo/request": "dojo/request/xhr", //Force using xhr since we know we are in the browser
            "dojo/request/iframe": "dojo/request/iframe" //Override above line for iframe path.
        }
    },
    deps: [
        "store/EntryStore",
        "dojo/_base/window",
        "dojo/request/iframe",
        "dojo/request/xhr",
        "dojo/promise/all"
    ]
});