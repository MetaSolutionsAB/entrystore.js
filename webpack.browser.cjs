const webpack = require('webpack');
const path = require('path');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'entrystore.js',
    library: 'ESJS',
  },
  plugins: [
    new webpack.DefinePlugin({ 'global.GENTLY': false }), // needed by superagent
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment/,
    })
  ],
  context: __dirname, // string (absolute path!)
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
                shippedProposals: true,
                useBuiltIns: 'usage',
                corejs: 3,
                targets: {
                  ie: 11,
                },
              },
            ]],
            plugins: [
              '@babel/plugin-proposal-object-rest-spread',
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-syntax-dynamic-import',
            ],
          },
        }],
      },
    ]
  },
};
