const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const config = {
  target: 'node',
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'EntryStore.node.js',
    library: 'EntryStore',
    libraryTarget: 'commonjs2',
  },
  plugins: [
    new webpack.DefinePlugin({ 'global.GENTLY': false }),
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
        },
      },
    ],
  },
  context: __dirname, // string (absolute path!)
};

module.exports = config;
