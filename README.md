# EntryStore.js

EntryStore.js is a JavaScript library that simplifies the communication with the EntryStore REST API.

# Installation

Before you can use entrystore.js you need to make sure that you have all dependencies are available. Simply run:

    $ cd path_to_entrystore.js
    $ yarn

This requires that you have [nodejs](http://nodejs.org/), [npm](https://www.npmjs.org/) and [yarn](https://yarnpkg.com) installed.

# Build

Run `yarn build`.

The resulting build is located in `dist`.

# Latest Build

You can also load the latest stable build of EntryStore.js from:
[http://entrystore.org/js/stable/](http://entrystore.org/js/stable/)

# Getting started with the API

Here are three examples for getting an idea of how to use the API.

## Loading an entry - complete walk through
What follows is a complete example for loading an existing entry from an EntryStore repository. First we need to load the
Entrystore.js library, i.e.:

      <script src="../dist/all.js"></script>

Second we need to load the part of the API we need, as the EntryStore.js uses the AMD approach you use the require method for this:

      require(['store/EntryStore'], function(EntryStore) {
          //Some code using the EntryStore class from the API.
      });

Third, we need to initialize the EntryStore API using a repository URL:

    // Specify the repository URL.
    var es = new EntryStore("http://localhost:8080/store");
    // OR, rely on the defaults, it will initialize using the window.location.origin + "/store/".
    var es = new EntryStore();

Notice that when running in the browser, you cannot currently point to a repository residing on another domain as
this will not work according to the cross-domain restriction of current browsers. (There are plans to fix this issue using
CORS and / or hidden iframes to overcome various browser limitations.)

Fourth, we need to construct a URI for the entry to fetch:

    var entryURI = es.getEntryURI("1", "5")

Here we are assuming there is a contextId "1" and a entryId "5" in the referred to repository. For in-memory test installation with the test-suite installed these ids exists by default, change accordingly otherwise.

Fifth, we need to load the entry and wait for the result using the Promise approach (the .then method).

    es.getEntry(entryURI).then(function(entry) {
    });

Finally we want to do something with the loaded entry. In this example we just fetch the metadata object of the entry and find the first value with the dcterms:title property:

    alert("Loaded entry with title: "+entry.getMetadata().findFirstValue(null, "dcterms:title"));

All taken together and packaged into a minimal HTML file the example looks like the following:

    //See file in trunk/samples/loadEntry-dev.html
    <html><body>
      <script src="../release/all.js"></script>
      <script type="text/javascript">
          require(['store/EntryStore'], function(EntryStore) {
              var es = new EntryStore();
              var entryURI = es.getEntryURI("1", "5");
              es.getEntry(entryURI).then(function(entry) {
                  alert("Loaded entry with title: "+entry.getMetadata().findFirstValue(null, "dcterms:title"));
              }, function(err) {
                  alert("Failure to load entry: "+err);
              });
          });
      </script>
    </body></html>

See trunk/samples/loadEntry-dev.html, but there is also a version that works directly with the built code, see trunk/samples/loadEntry.html

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

## Modifying metadata
//TODO

# Testing

The tests are run against a running EntryStore instance; it is recommended to use a non-persisting EntryStore instance with memory store.
The base URL of the instance is configured in a file `tests/config.js` that you have to provide,
for instance by making a copy of `tests/config.js_example` and then adapt it.

The tests are written according to the style of [Nodeunit](https://github.com/caolan/nodeunit).

## Running tests 

    > yarn tests

## Developing new tests

It is recommended to create a new module for each group of tests. Include it in the `tests/config.js` file to make it part of the testsuite.

# Command line

This feature is not supported currently.

### Generating Licenses
If you would like to create a file listing all the licenses of dependencies run:
```
yarn print-licenses
