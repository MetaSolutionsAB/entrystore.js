define([
    'dojo/_base/kernel'
], function(kernel) {
    //Polyfill for Blob in node environment, expected to exist by dojo/request/util line 124
    Blob = function() {};
    //Dojo initialization hack when using require.js loader
    kernel.global.require = this.requirejsVars;
});