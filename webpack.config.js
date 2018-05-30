const path = require('path');
const webpack = require('webpack');

const UglifyJSPlugin = require('uglifyjs-webpack-plugin');


const config = {
  entry: './index.js',
  devtool: '#inline-source-map',
  mode: 'development',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'all.js',
    library: 'EntryStore',
    libraryExport: 'default',
    libraryTarget: "umd"
  },
  plugins: [
    //new webpack.NormalModuleReplacementPlugin(/^dojo\/text!/, function(data) {
      //data.request = data.request.replace(/^dojo\/text!/, "!!raw-loader!");
    //}),
    //new UglifyJSPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['es2015'],
          }

        }
      },
    ],
  },
};

module.exports = config;
