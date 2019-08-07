const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const config = {
  devtool: 'inline-source-map',
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'EntryStore.js',
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
        use: [{
          loader: 'babel-loader',
          options: {
            presets: [[
              '@babel/preset-env', {
                targets: {
                  ie: 11,
                },
              },
            ]],
            plugins: [
              '@babel/plugin-proposal-object-rest-spread',
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-syntax-dynamic-import',
              ['@babel/plugin-transform-modules-commonjs', { strictMode: false }],
            ],
          },
        }],
      },
    ],
  },
  context: __dirname, // string (absolute path!)
};

module.exports = config;
