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

    git pull -s subtree rdfjson master

The following commands where given to include it in the first place (just to remember):

    git remote add -f rdfjson git@bitbucket.org:metasolutions/rforms.git
    git merge -s ours --no-commit rdfjson/master
    git read-tree --prefix=src/rdfjson/ -u rdfjson/master:src/rdfjson
    git commit -m "Subtree merge of src/rdfjson from RForms repository."

# BUILD

Run the trunk/build/build.sh
The resulting build are located in trunk/release and the relevant files are:

* trunk/release/dojo/dojo.js				  	(Minified, without logging)
* trunk/release/dojo/dojo.js.uncompressed.js	(Readable, with logging)
* trunk/release/dojo/dojo.js.consoleStripped.js	(Readable, without logging)

# TESTING

The tests are located in trunk/tests
