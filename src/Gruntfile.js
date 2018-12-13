module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        eslint: {
            target: ['t.js'],
            options: {
                "extends": ["eslint:recommended"],
                "env": {
                    "browser": true,
                    "node": true
                },
                "globals": ["window", "console", "define"],
                "rules": {
                    "eqeqeq": "error",
                    "curly": "error",
                    "quotes": ["error", "double"],
                    "comma-dangle": ["error", "always"]
                }
            }
        }
    });

    grunt.registerTask('default', ['eslint']);
};