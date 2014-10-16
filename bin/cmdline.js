// Configuration Object for Dojo Loader:
repl = require("repl");
vm = require("vm");

dojoConfig = {
    baseUrl: "../", // Where we will put our packages
    "async": 1,
    hasCache: {
        "host-node": 1, // Ensure we "force" the loader into Node.js mode
        "dom": 0 // Ensure that none of the code assumes we have a DOM
    },
    // While it is possible to use config-tlmSiblingOfDojo to tell the
    // loader that your packages share the same root path as the loader,
    // this really isn't always a good idea and it is better to be
    // explicit about our package map.
    packages: [
        {
            name: "dojo",
            location: "libs/dojo"
        }, {
            name: "dojox",
            location: "libs/dojox"
        }, {
            name: "rdfjson",
            location: "libs/rdfjson"
        }, {
            name: "store",
            location: "."
        }],
    deps: ["store/cmd"] // And array of modules to load on "boot"
};

// Now load the Dojo loader
require("../libs/dojo/dojo.js");
