const config = require('./config');
const Auth = require('./Auth');
const Cache = require('./Cache');
const Entry = require('./Entry');
const EntryInfo = require('./EntryInfo');
const EntryStore = require('./EntryStore');
const EntryStoreUtil = require('./EntryStoreUtil');
const File = require('./File');
const List = require('./List');
const Pipeline = require('./Pipeline');
const solr = require('./solr');
const Node = require('./Node');
// const Inferred = require('./Inferred');

const allTests = {
  Auth,
  Cache,
  Entry,
  EntryInfo,
  EntryStore,
  EntryStoreUtil,
  File,
  List,
  Pipeline,
  solr,
  Node,
  // Inferred,
};

module.exports = [...config.tests, ...config.nodeTests].reduce((accum, property) => {
  accum[property] = allTests[property];
  return accum;
}, {});
