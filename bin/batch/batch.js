// Configuration Object for Dojo Loader:

if (process.argv.length < 3) {
    console.log("You have to provide three parameters for this command");
    console.log("$> node batch.js batch_operation_name");
    console.log("Note, batch.js should end in .js, while the batch_operation_name should not end with .js (although it corresponds to a file in this directory ending in .js");
    process.exit();
} else {
    console.log("Will now execute batch operation located in file: "+ process.argv[2]+".js");
}
var batchName = process.argv[2];

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
        }, "bin"
    ],
    deps: ["bin/"+batchName] // And array of modules to load on "boot"
};

// Now load the Dojo loader
require("../libs/dojo/dojo.js");
