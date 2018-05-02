const path = require('path');
const DojoWebpackPlugin = require('dojo-webpack-plugin');
//const CleanWebpackPlugin = require('clean-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');


module.exports = {
  entry: './package.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'spa.js',
    //library: 'spa',
    //libraryTarget: "umd"
  },
  plugins: [
    //new CleanWebpackPlugin(),
    new DojoWebpackPlugin({
      loaderConfig: require('./loaderConfig')({dojoRoot: './libs'}),
    }),
    //new UglifyJSPlugin(),
  ],
};
