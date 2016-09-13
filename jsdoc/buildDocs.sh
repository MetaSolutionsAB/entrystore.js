#!/bin/bash

JSDOC_PATH=$(which jsdoc)
if [ -x "$JSDOC_PATH" ] ; then
    jsdoc ../*.js -d . -t ../node_modules/jaguarjs-jsdoc -c conf.json
    cp main_AMDfix.js scripts/main.js
else
    echo "Requires that you have jsdoc installed, install it via 'sudo npm install -g jsdoc'"
fi


