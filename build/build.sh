#!/usr/bin/env bash

(
cd ../lib/dojo-src
NODE_PATH=$(which node)
if [ -x "$NODE_PATH" ] ; then
    node dojo/dojo.js load=build --profile ../../build/storejs.profile.js --release 
else
    nodejs dojo/dojo.js load=build --profile ../../build/storejs.profile.js --release 
fi
)

(
cd ../release
cp dojo/dojo.js entrystore.js
cp dojo/dojo.js.uncompressed.js entrystore.js.uncompressed.js
cp dojo/dojo.js.consoleStripped.js entrystore.js.consoleStripped.js
)
