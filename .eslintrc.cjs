module.exports = {
  "extends": "airbnb-base",
  "rules": {
    "import/no-amd": "off",
    "import/extensions": "off",
    // TODO remove this. use requirejs rules instead
    "no-undef": "off",
    //  Maybe this is better : no-underscore-dangle: [2, { "allowAfterThis": true }]
    "no-underscore-dangle": "off",
    "prefer-rest-params": "off",
    "no-plusplus": ["error", { "allowForLoopAfterthoughts": true }],
    "import/no-dynamic-require": "off",
    "global-require": "off",
    "no-console": "off",
    "no-prototype-builtins": "off",
    "no-param-reassign": ["error", { "props": false }],
    'max-len': ['error', { 'code': 120, "ignoreTrailingComments": true, "ignoreTemplateLiterals": true }],
    "no-restricted-syntax": ["error", "WithStatement", "BinaryExpression[operator='in']"]
  }
};
