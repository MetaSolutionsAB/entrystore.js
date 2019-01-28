const config = require('./config');
const Auth = require('./Auth');
const Cache = require('./Cache');
const Entry = require('./Entry');
const EntryInfo = require('./EntryInfo');
const EntryStore = require('./EntryStore');
const File = require('./File');
const List = require('./List');
const Pipeline = require('./Pipeline');
const solr = require('./solr');

const allTests = {
  Auth,
  Cache,
  Entry,
  EntryInfo,
  EntryStore,
  File,
  List,
  Pipeline,
  solr,
};

module.exports = config.tests.reduce((accum, property) => {
  accum[property] = allTests[property];
  return accum;
}, {});
