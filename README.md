# EntryStore.js or StoreJS in short

StoreJS is a javascript library that simplifies the communication with the EntryStore REST API.

# INSTALL

Run the trunk/lib/INSTALL-dojo.sh to install dojo.


# DEVELOPMENT

We try to follow the development guide outlined here:
https://github.com/maqetta/maqetta/wiki/Development-Guide

Except that at this time we do not rely on es5 or a shim, hence we use dojos lang.hitch and array.forEach etc.

The directory `src/rdfjson` originate from the rforms project and are added into the project via
the [git subtree merge strategy](https://www.kernel.org/pub/software/scm/git/docs/howto/using-merge-subtree.html).
Hence, never change any files in that directories directly. Instead make the changes
in the [RForms repository](https://bitbucket.org/metasolutions/rforms) and integrate the changes by making a:

    > git pull -s subtree rdfjson master

The following commands where given to include it in the first place (just to remember):

    > git remote add -f rdfjson git@bitbucket.org:metasolutions/rforms.git
    > git merge -s ours --no-commit rdfjson/master
    > git read-tree --prefix=src/rdfjson/ -u rdfjson/master:src/rdfjson
    > git commit -m "Subtree merge of src/rdfjson from RForms repository."

# BUILD

Run the trunk/build/build.sh
The resulting build are located in trunk/release and the relevant files are:

* trunk/release/dojo/dojo.js				  	(Minified, without logging)
* trunk/release/dojo/dojo.js.uncompressed.js	(Readable, with logging)
* trunk/release/dojo/dojo.js.consoleStripped.js	(Readable, without logging)

# Unit testing of StoreJS

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
The current files where generated from the master branch at the 27:th of January 2014.

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