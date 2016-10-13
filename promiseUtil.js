/*global define*/

define([
    "exports",
    "dojo/Deferred"
], function (exports, Deferred) {


    /**
     * This module contains utility methods for promises.
     *
     * @exports store/promiseUtil
     * @namespace
     */
    var promiseUtil = exports;


    /**
     * Asynchronous forEach relying on promises that works in serial rather than parallell.
     * It invokes a function on each item only after the promise from the previous item
     * in the array has succeeded.
     * If one of the promises fails the forEach promise fails altogheter.
     * The result is provided in an array if the items is an array.
     * In the case where the items is an object the same object is returned
     * but with the values replaced with the result of the promise.
     * (The function is applied to the value of each key in the items object.)
     *
     * @param {array|object} items
     * @param {function} func a function that is applied to each item and must return a promise
     * @returns {forEachPromise}
     */
    promiseUtil.forEach = function(items, func) {
        var arr, cursor, d = new Deferred(), onFailure = function(err) {
            d.reject(err);
        };
        if (items instanceof Array) {
            var results = [];
            arr = items.slice();
            cursor = function(result) {
                results.push(result);
                if (arr.length > 0) {
                    return func(arr.pop()).then(cursor, onFailure);
                } else {
                    d.resolve(results);
                }
            };
            func(arr.pop()).then(cursor, onFailure);
        } else if (typeof items === "object") {
            arr = [];
            for (var key in items) if (items.hasOwnProperty(key)) {
                arr.push(key);
            }

            var itemKey;
            var onSuccess = function(result) {
                items[itemKey] = result;
                cursor();
            };
            cursor = function() {
                if (arr.length > 0) {
                    itemKey = arr.pop();
                    func(items[itemKey]).then(onSuccess, onFailure);
                } else {
                    d.resolve(items);
                }
            };
            cursor();
        }
        return d;
    };

    /**
     * @name forEachPromise
     * @extends dojo/promise/Promise
     * @class
     */
    /**
     * @name forEachPromise#then
     * @param {forEachCallback} onSuccess
     * @param {function} onError
     */
    /**
     * @callback forEachCallback
     * @param {array|object} result
     */


    /*    exports.forEachSuccess = function(itemArr, func) {
            var arr = itemArr.slice();
            var success = [], cursor, onSucc = function(result) {
                success.push(result);
                cursor();
            };
            cursor = function() {
                if (arr.length > 0) {
                    return func(arr.pop()).then(onSucc, cursor);
                } else {
                    var d = new Deferred();
                    d.resolve(success);
                    return d;
                }
            };
            cursor();
        };

        exports.forEachResults = function(itemArr, func) {
            var arr = itemArr.slice();
            var success = [], errors = [], allCounter = 0, succCounter = 0, errCounter = 0, onSucc, onErr, cursor;
            onSucc = function(result) {
                succCounter++;
                allCounter++;
                success[allCounter] = result;
                cursor();
            };
            onErr = function(err) {
                errCounter++;
                allCounter++;
                errors[allCounter] = err;
                cursor();
            };
            cursor = function() {
                if (arr.length > 0) {
                    return func(arr.pop()).then(onSucc, onErr);
                } else {
                    var d = new Deferred();
                    if (res)
                    d.resolve({
                        success: success,
                        successCounter: succCounter,
                        failure: errors,
                        failureCounter: errCounter
                    });
                    return d;
                }
            };
            cursor();
        };
    */
    return exports;
});