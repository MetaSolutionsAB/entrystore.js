const path = require('path');
const DojoWebpackPlugin = require('dojo-webpack-plugin');
const webpack = require('webpack');

const UglifyJSPlugin = require('uglifyjs-webpack-plugin');


const config = {
  entry: './tests/executeAllTests.js',
  mode: 'development',
  //devtool: '#inline-source-map',
  output: {
    path: path.join(__dirname, 'tests/html'),
    filename: 'tests.js',
    libraryTarget: 'umd',
  },
  plugins: [
    new DojoWebpackPlugin({
      loaderConfig: require('./loaderConfig'),
      buildEnvironment: {dojoRoot: './node_modules'},
    }),
  ],
};

module.exports = config;
