# EntryStore.js

EntryStore.js (short: StoreJS) is a JavaScript library that simplifies the communication with the EntryStore REST API.

# Installation

Before you can use entrystore.js you need to make sure all dependencies are available. Simply run:

    $ cd path_to_rdforms
    $ npm   install
    $ bower install

This requires that you have [nodejs](http://nodejs.org/) and [npm](https://www.npmjs.org/) installed
as well as [bower](http://bower.io/). Note: npm installs the nodeunit library used by the tests while bower installs
dojo, rdfjson and the dojo-util libraries.

# Development

We try to follow the development guide outlined here:
https://github.com/maqetta/maqetta/wiki/Development-Guide

Except that at this time we do not rely on es5 or a shim, hence we use dojos lang.hitch and array.forEach etc.

# Build

Run `cd build && ./build.sh`.

The resulting build is located in `release` and the relevant files are:

* `release/entrystore.js` (minified, without logging)
* `release/entrystore.js.uncompressed.js` (readable, with logging)
* `release/entrystore.js.consoleStripped.js` (readable, without logging)

# Latest Build

The latest build of EntryStore.js is always available from:
[https://drone.io/bitbucket.org/metasolutions/entrystore.js/files](https://drone.io/bitbucket.org/metasolutions/entrystore.js/files)

# Getting started with the API

Lets do three examples for getting an idea of how to use the API.

## Loading an entry - complete walk through
We start by walking through a complete example for loading an existing entry from an EntryStore repository. First we need to load the
Entrystore.js library, i.e.:

      <script src="../release/entrystore.js"></script>

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

    var entryURI = es.getEntryURI("1", "_top")

Here we are assuming there is a contextId "1" and a entryId "_top" in the referred to repository, this is always the case if you
are connecting to an in-memory test installation where some test-suite of data is made available by default, change accordingly otherwise.

Fifth, we need to load the entry and wait for the result using the Promise approach (the .then method).

    es.getEntry(entryURI).then(function(entry) {
    });

Finally we want to do something with the loaded entry. In this example we just fetch the metadata object of the entry and find
the first value with the dcterms:title property:

    alert("Loaded entry with title: "+entry.getMetadata().findFirstValue(null, "http://purl.org/dc/terms/title"));

All taken together and packaged into a minimal HTML file the example looks like the following:

    //See file in trunk/samples/loadEntry-build.html
    <html><body>
      <script src="../release/entrystore.js"></script>
      <script type="text/javascript">
          require(['store/EntryStore'], function(EntryStore) {
              var es = new EntryStore();
              var entryURI = es.getEntryURI("1", "_top");
              es.getEntry(entryURI).then(function(entry) {
                  alert("Loaded entry with title: "+entry.getMetadata().findFirstValue(null, "http://purl.org/dc/terms/title"));
              }, function(err) {
                  alert("Failure to load entry: "+err);
              });
          });
      </script>
    </body></html>

See trunk/samples/loadEntry-build.html, but there is also a version that works directly with the non-built code, see trunk/samples/loadEntry.html

## Creating an entry
To create an entry we need to first authenticate and get a hold of the specific context we want to create the entry in:

    es.auth({user: "donald", password: "donalddonald"}).then(function() {
       var c = es.getContextById("1");
       //more code here
    });

To create an entry involves two steps, first we initiate a new entry by calling newEntry, and then we have the chance of
providing additional information in the entry before we call the repository via the create command, in this example
we create the entry directly.

    c.newEntry().create().then(function(entry) {
       //Potentially do something further with the created entry.
    });

Taken together the example, looks like (full code in trunk/samples/createEntry-build.html and strip the -build to get the
version running against the non-built code):

    es.auth({user: "donald", password: "donalddonald"}).then(function() {
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

## Running unit tests in node

Make sure you have nodeunit installed:

    > cd tests/node
    > npm install nodeunit

Then to run the test do the following:

    > node init.js

## Running unit tests in a browser

Point your browser to the `tests/html/index.html` file. It works both via the file and http protocolls.
Note though that the http requires that you configure a webserver to serve StoreJS.

The nodeunit js and css file is retrieved by compiling the nodeunit framework.
The current files were generated from the master branch at the 27:th of January 2014.

## Developing new tests

It is recommended to create a new AMD module for each group of tests. Include it in the `tests/config.js` file
to make it part of the testsuite.

# Command line

The StoreJS library also allows command line access to a EntryStore repository. To start the command line you need to have node installed, then:

    > cd bin
    > node cmdline.js
     ---------------------------------------------------------------------------
    | Welcome to the EntryStore Shell, to get help with commands type 'help()'  |
     ---------------------------------------------------------------------------
    ES>

The first thing you need to do is to connect to a repository, and then to select a context and maybe a entry like this:

    ES> repository("http://localhost:8080/store")
    ==>   Variable 'r' contains the current respository, that is: "http://localhost:8080/store"
    ES> context("1")
    ==>   Variable 'c' contains the current context, that is: "http://localhost:8080/store/1"
    ==>   Variable 'o' contains the current contexts own entry, that is "http://localhost:8080/store/_contexts/entry/1"
    ES> entry("1")
    ==>   Variable 'e' contains the current entry, that is: "http://localhost:8080/store/1/entry/1"

Check the help() command to get an idea of what you can do more.
