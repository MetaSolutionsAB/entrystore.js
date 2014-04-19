// Configuration Object for Dojo Loader:
dojoConfig = {
    baseUrl: "../../libs", // Where we will put our packages
    async: 1, // We want to make sure we are using the "modern" loader
    hasCache: {
        "host-node": 1, // Ensure we "force" the loader into Node.js mode
        "dom": 0 // Ensure that none of the code assumes we have a DOM
    },
    // While it is possible to use config-tlmSiblingOfDojo to tell the
    // loader that your packages share the same root path as the loader,
    // this really isn't always a good idea and it is better to be
    // explicit about our package map.
    packages: [
        "dojo",
        "rdfjson",
        {
            name: "store",
            location: ".."
        },{
            name: "tests",
            location: "../tests"
        }],
    deps: ["tests/config", "store/tests/executeAllTests"] // And array of modules to load on "boot"
};

// Make the nodeunit library available as a global variable.
nodeunit = require("nodeunit");

// Now load the Dojo loader
require("../../libs/dojo/dojo.js");