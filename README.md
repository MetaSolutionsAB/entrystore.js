# EntryStore.js

EntryStore.js is a JavaScript library that simplifies the communication with the EntryStore REST API.

# Installation

You can install EntryStore.js from npm:

    $ npm install @entryscape/entrystore-js

Or download the latest stable version from: [http://entrystore.org/js/stable/](http://entrystore.org/js/stable/)

Or use it directly from a CDN: [https://unpkg.com/@entryscape/entrystore-js](https://unpkg.com/@entryscape/entrystore-js)

You can also check out the repository from: [https://bitbucket.org/metasolutions/entrystore.js/](https://bitbucket.org/metasolutions/entrystore.js/)

Then run the following to get the build version in the dist folder:

    $ yarn
    $ yarn build

(This requires that you have [nodejs](http://nodejs.org/), [npm](https://www.npmjs.org/) and [yarn](https://yarnpkg.com) installed.)

EntryStore.js is available in the following variants:

* dist/entrystore.js - browser version
* dist/entrystore.node.cjs - Built Node.js version packaged for CommonJS
* src/index.js - Single ES Module (of course you can also depend on individual files)

# Getting started

Below we go through three examples for how to use the library (the following section describes how to get more examples running locally).

## Loading and changing the metadata of an entry
What follows is a complete example for loading an existing entry from an EntryStore repository. First we need to load the
Entrystore.js library in our application, i.e.:

      <script src="../dist/entrystore.js"></script>
      // or
      <script src="https://unpkg.com/@entryscape/entrystore-js"></script>
 

Then, we need to initialize the EntryStore API using a repository URL:

    // Specify the repository URL.
    var es = new ESJS.EntryStore("http://localhost:8080/store");
    // OR, rely on the defaults, it will initialize using the window.location.origin + "/store/".
    var es = new ESJS.EntryStore();

Notice that when running in the browser, you cannot currently point to a repository residing on another domain as
this will not work according to the cross-domain restriction of current browsers. (There are plans to fix this issue using
CORS and / or hidden iframes to overcome various browser limitations.)

Then, we need to construct a URI for the entry to fetch:

    var entryURI = es.getEntryURI("1", "5")

Here we are assuming there is a contextId "1" and a entryId "5" in the referred to repository. For in-memory test installation with the test-suite installed these ids exists by default, change accordingly otherwise.

Then, we need to load the entry and wait for the result using Promise or async/await.

    es.getEntry(entryURI).then(function(entry) {
    });
    // or
    const entry = await es.getEntry(entryURI);

Finally, we want to do something with the loaded entry.
In this example we just fetch the metadata object of the entry and find the first value with the dcterms:title property:

    alert("Loaded entry with title: "+entry.getMetadata().findFirstValue(entry.getResourceURI(), "dcterms:title"));

## Changing the metadata of an entry
Let's continue with the example above and change the title.

    var md = entry.getMetadata();
    var stmts = md.findAndRemove(entry.getResourceURI(), "dcterms:title");
    md.addL(entry.getResourceURI(), "dcterms:title", "New title at " + new Date(), "en");
    entry.commitMetadata().then(() => {
        alert("Success: changed metadata");
    }, (err) => {
        alert("Failure saving metadata: " + err);
    });

Here is the above example in a minimal HTML file.
    
    <html>
    <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8">
        <script src="../dist/entrystore.js"></script>
        <script src="./init.js"></script>
        <script>
          const es = new ESJS.EntryStore(config.repository);
          es.getAuth().login(config.username, config.password, 86400).then(() => {
            const entryURI = es.getEntryURI(config.contextId, config.entryId);
            es.getEntry(entryURI).then((entry) => {
              var md = entry.getMetadata();
              var stmts = md.findAndRemove(null, "dcterms:title");
              md.addL(entry.getResourceURI(), "dcterms:title", "New title at " + new Date(), "en");
              entry.commitMetadata().then(() => {
                alert("Success: changed metadata");
              }, (err) => {
                alert("Failure saving metadata: " + err);
              });
            }, (err) => {
              alert("Failed loading entry: " + err);
            });
          });
        </script>
    </head>
    <body>
    </html>

## Creating an entry
To create an entry we need to first authenticate and get a hold of the specific context we want to create the entry in:

    es.getAuth().login("donald", "donalddonald").then(function() {
       var c = es.getContextById("1");
       //more code here
    });

To create an entry involves two steps, first we initiate a new entry by calling newEntry, and then we have the chance of providing additional information in the entry before we call the repository via the create command, in this example we create the entry directly.

    c.newEntry().create().then(function(entry) {
       //Potentially do something further with the created entry.
    });

Taken together the example, looks like (full code in trunk/samples/createEntry.html):

    es.getAuth().login("donald", "donalddonald").then(function() {
       var c = es.getContextById("1");
       c.newEntry().create().then(function(entry) {
           alert("Created an entry!");
       }, function(err) {
           alert("Failed to create an entry! + err");
       });
    });

## Running examples
For the provided examples to work properly you have to have an EntryStore instance running:

    $ yarn entrystore:examples

To be able to run examples in a browser environment we need to avoid CORS issues by serving the examples from the same domain. The following command brings up both a webserver with the examples and a reverse proxy to the entrystore instance we just launched. 

    $ yarn examples

You should now be able to visit [http://127.0.0.1:8080/examples/](http://127.0.0.1:8080/examples/) in your favourite browser. You should get a listing of the examples to run.

# Testing

The tests have to run against a EntryStore instance. To bring one up an instance that is suitable for testing run:

    $ yarn entrystore:tests

When that is running, open another terminal and run:

    $ yarn tests

The tests are written according to the style of [Jest](https://jestjs.io/).

## Test coverage
Collecting test coverage can be done by setting the property of package.json "jest": "collectCoverage" to true. The coverage an then be found in the folder located at tests/coverage

## Developing new tests

It is recommended to create a new module for each group of tests. Include it in the `src` folder, using the Jest naming convention of 'file.test.js' to make it part of the testsuite.
