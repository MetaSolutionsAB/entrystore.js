import { node as nodeConfig } from '@entryscape/linting-config';

export default [
  ...nodeConfig,
  {
    rules: {
      'import/extensions': ['error', 'always', { ignorePackages: true }],
    },
  },
];
