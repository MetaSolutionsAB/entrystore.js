require.config({
  baseUrl: '../node_modules',
  paths: {
    store: '..',
    requireLib: 'requirejs/require',
    config: '../config',
    tests: '../tests',
  },
  packages: [
    {
      name: 'md5',
      location: 'blueimp-md5/js',
      main: 'md5.min',
    },
  ],

  map: {
    'store/Rest': {
            // Force using xhr since we know we are in the browser
      'dojo/request': 'dojo/request/xhr',
            // Override above line for paths to iframe and script.
      'dojo/request/iframe': 'dojo/request/iframe',
      'dojo/request/script': 'dojo/request/script',
    },
  },
  deps: [
    'store/EntryStore',
    'dojo/_base/window',
    'dojo/request/xhr',
    'dojo/request/iframe',
    'dojo/request/script',
    'dojo/promise/all',
  ],
});
