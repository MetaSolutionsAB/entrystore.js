#!/bin/bash

JSDOC_PATH=$(which jsdoc)
if [ -x "$JSDOC_PATH" ] ; then
    jsdoc ../*.js -d .
else
    echo "Requires that you have jsdoc installed, install it via 'sudo npm install -g jsdoc'"
fi


