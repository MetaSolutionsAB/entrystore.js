const common = require('./webpack.common.js')
const merge = require('webpack-merge')
const path = require('path');

const nodeConfig = merge({
  target: 'node',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: "EntryStore.node.js",
    library: 'EntryStore',
  },
  mode: 'production',
});

module.exports = [merge(common, {
  mode: 'production',
}), nodeConfig];
