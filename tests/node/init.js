// Make the nodeunit library available as a global variable.
nodeunit = require("nodeunit");
requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "../../node_modules",
    deps: [
        "../../config/node-deps.js",
        'tests/config',
        'store/tests/executeAllTests'
    ]
});