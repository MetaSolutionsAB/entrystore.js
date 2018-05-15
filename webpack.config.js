const path = require('path');
const DojoWebpackPlugin = require('dojo-webpack-plugin');
const webpack = require('webpack');

//const CleanWebpackPlugin = require('clean-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');


const config = {
  entry: './index.js',
  devtool: '#inline-source-map',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'all.js',
    library: 'EntryStore',
    libraryExport: 'default',
    libraryTarget: "umd"
  },
  plugins: [
    //new CleanWebpackPlugin(),
    new DojoWebpackPlugin({
      loaderConfig: require('./loaderConfig'),
      buildEnvironment: {dojoRoot: './node_modules'},
    }),
    //new webpack.NormalModuleReplacementPlugin(/^dojo\/text!/, function(data) {
      //data.request = data.request.replace(/^dojo\/text!/, "!!raw-loader!");
    //}),
    //new UglifyJSPlugin(),
  ],
};

module.exports = config;
