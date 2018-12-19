const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const config = {
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: "EntryStore.js",
    library: 'EntryStore',
    libraryTarget: "umd"
  },
  plugins: [
    // For plugins registered after the DojoAMDPlugin, data.request has been normalized and
    // resolved to an absMid and loader-config maps and aliases have been applied
    // new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /en|sv/),
    new CleanWebpackPlugin(),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        }
      },
    ]
  },
  node: {
    fs: 'empty',
    process: false,
    global: false
  },
  context: __dirname, // string (absolute path!)
};

module.exports = config;
