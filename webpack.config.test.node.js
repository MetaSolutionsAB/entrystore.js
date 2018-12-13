const path = require('path');
const webpack = require('webpack');

const config = {
  entry: './tests/executeAllTests.js',
  mode: 'development',
  target: 'node',
  plugins: [
    new webpack.DefinePlugin({ "global.GENTLY": false })
  ],
  output: {
    path: path.join(__dirname, 'tests'),
    filename: 'nodeTests.js',
  },
};

module.exports = config;
