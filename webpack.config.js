const path = require('path');
const DojoWebpackPlugin = require('dojo-webpack-plugin');
//const CleanWebpackPlugin = require('clean-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');


const config = {
  entry: './index.js',
  devtool: '#inline-source-map',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'all.js',
    library: 'EntryStore',
    libraryTarget: "umd"
  },
  plugins: [
    //new CleanWebpackPlugin(),
    new DojoWebpackPlugin({
      loaderConfig: require('./loaderConfig')({dojoRoot: './node_modules'}),
    }),
    //new UglifyJSPlugin(),
  ],
};

module.exports = config;
