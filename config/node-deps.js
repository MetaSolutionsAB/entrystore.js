require.config({
    paths: {
        "store": "..",
        "md5": "md5/js/md5.min",
        "config": "../config",
        "tests": "../tests"
    },
    map: {
        "store/rest": {
            "dojo/request": "dojo/request/node" //Force using nodejs loading
        }
    },
    deps: [
        'config/fix',
        "store/EntryStore",
        "dojo/request/node",
        "dojo/promise/all"
    ]
});