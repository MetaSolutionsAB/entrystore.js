const merge = require('webpack-merge');
const commonConfig = require('./webpack.common.js');
const path = require('path');

module.exports = merge(commonConfig, {
  target: 'node',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'EntryStore.node.js',
    library: 'EntryStore',
    libraryTarget: 'commonjs2',
  },
});
