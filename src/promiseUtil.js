/**
 * This module contains utility methods for promises.
 *
 * @exports store/promiseUtil
 * @namespace
 */
const promiseUtil = {};

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
promiseUtil.forEach = (items, func) => new Promise((resolve, reject) => {
  let arr;
  let cursor;
  const onFailure = (err) => {
    reject(err);
  };
  if (Array.isArray(items)) {
    const results = [];
    arr = items.slice();
    cursor = (result) => {
      results.push(result);
      if (arr.length > 0) {
        return promiseUtil.toPromise(func(arr.shift())).then(cursor, onFailure);
      }
      resolve(results);
      return undefined;
    };
    if (arr.length === 0) {
      resolve(results);
    } else {
      promiseUtil.toPromise(func(arr.shift())).then(cursor, onFailure);
    }
  } else if (typeof items === 'object') {
    arr = Object.keys(items);
    let itemKey;
    const onSuccess = (result) => {
      items[itemKey] = result;
      cursor();
    };
    cursor = () => {
      if (arr.length > 0) {
        itemKey = arr.shift();
        promiseUtil.toPromise(func(items[itemKey])).then(onSuccess, onFailure);
      } else {
        resolve(items);
      }
    };
    cursor();
  }
});

/**
 * Makes sure a value is a promise, if needed wraps it as a promise.
 * If the value the false boolean it is interpreted as a reject.
 *
 * @param value the value to wrap in a promise, if it already is a promise it is returned.
 * @return {Promise}
 */
promiseUtil.toPromise = (value) => {
  if (typeof value === 'object' && value !== null && typeof value.then === 'function') {
    return value;
  }
  if (value === false) {
    return Promise.reject(value);
  }
  return Promise.resolve(value);
};

/**
 * Use setTimeout with promise. This is useful when you want to do things like
 * Promise.all(
 *  promise1,
 *  promiseUtil.delay(1000),
 * ]);
 * @param millisecs
 * @returns {Promise<any>}
 */
promiseUtil.delay = millisecs => new Promise(resolve => setTimeout(resolve, millisecs));

export default promiseUtil;

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

