const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const moduleConfig = {
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
};

const plugins = [
  new webpack.DefinePlugin({ 'global.GENTLY': false }), // needed by superagent
  new CleanWebpackPlugin(),
  new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
];

const context = __dirname;

const serverConfig = {
  target: 'node',
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'entrystore.node.js',
    library: 'EntryStore',
    libraryTarget: 'commonjs2',
  },
  devtool: 'cheap-module-source-map',
  plugins,
  context, // string (absolute path!)
  module: moduleConfig,
};

const clientConfig = {
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'entrystore.js',
    library: 'EntryStore',
  },
  plugins,
  context, // string (absolute path!)
  module: moduleConfig,
};

module.exports = [serverConfig, clientConfig];
