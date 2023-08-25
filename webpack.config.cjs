const browserConfig = require('./webpack.browser.cjs');
const nodeConfig = require('./webpack.node.cjs');

module.exports = [nodeConfig, browserConfig];
