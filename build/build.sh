#!/usr/bin/env bash

echo "Building EntryStore.js using r.js."
node ../node_modules/requirejs/bin/r.js -o profile.js
