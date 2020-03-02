# EntryStore.js

EntryStore.js is a JavaScript library that simplifies the communication with the EntryStore REST API.

# Installation

Before you can use entrystore.js you need to make sure that you have all dependencies are available. Simply run:

    $ cd path_to_entrystore.js
    $ yarn

This requires that you have [nodejs](http://nodejs.org/), [npm](https://www.npmjs.org/) and [yarn](https://yarnpkg.com) installed.

# Build

Run `$ yarn build`

The resulting build is located in `dist`. There will be two versions of the library, one for browser and one for node usage.

# Latest Build

You can also load the latest stable build of EntryStore.js from:
[http://entrystore.org/js/stable/](http://entrystore.org/js/stable/)

# Getting started with the API

Here are three examples for getting an idea of how to use the API.

## Loading an entry - complete walk through
What follows is a complete example for loading an existing entry from an EntryStore repository. First we need to load the
Entrystore.js library in our application, i.e.:

      <script src="../dist/entrystore.js"></script>
      // or
      <script src="https://unpkg.com/@entryscape/entrystore-js"></script>
 

Then, we need to initialize the EntryStore API using a repository URL:

    // Specify the repository URL.
    var es = new EntryStore.EntryStore("http://localhost:8080/store");
    // OR, rely on the defaults, it will initialize using the window.location.origin + "/store/".
    var es = new EntryStore.EntryStore();

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

We can also change that value as follows:

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
        <script src="./config.js"></script>
        <script>
          const es = new EntryStore.EntryStore(config.repository);
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

## More samples
To check the suite of samples you can just run:
    
    $ yarn samples
    
your default web browser should open a new page where you can select the 'samples' directory.
There should be a listing of the samples which you can run directly in the browser. 

NOTE! you need to have a `config.js` file in the samples folder for the samples to work correctly. 
For more info check 'samples/config.js_example'.

## Modifying metadata
//TODO

# Testing

The tests are run against a running EntryStore instance; it is recommended to use a non-persisting EntryStore instance with memory store.
The base URL of the instance is configured in a file `tests/config.js` that you have to provide,
for instance by making a copy of `tests/config.js_example` and then adapt it.

The tests are written according to the style of [Nodeunit](https://github.com/caolan/nodeunit).

## Running tests 

    $ yarn tests

## Developing new tests

It is recommended to create a new module for each group of tests. Include it in the `tests/config.js` file to make it part of the testsuite.

# Command line

This feature is not supported currently.

### Generating Licenses
If you would like to create a file listing all the licenses of dependencies run:
```
    $ yarn print-licenses
