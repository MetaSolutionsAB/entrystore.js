#!/bin/sh

NODE_PATH=$(which node)
if [ -x "$NODE_PATH" ] ; then
  node init.js
else
  nodejs init.js
fi

exit $?
