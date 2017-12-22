require.config({
  paths: {
    store: '..',
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
    'store/rest': {
      'dojo/request': 'dojo/request/node', // Force using nodejs loading
    },
  },
  deps: [
    'config/fix',
    'store/EntryStore',
    'dojo/request/node',
    'dojo/promise/all',
  ],
});
