require([
    'dojo/_base/array',
    'tests/config'
], function (array, config) {

    var deps = array.map(config.tests, function(cls) {
        return "tests/"+cls;
    });
    require(deps, function() {
        var testClasses = Array.prototype.slice.call(arguments, 0);
        var nuConf = {};
        array.forEach(deps, function(dep, idx) {
            nuConf[dep] = testClasses[idx];
        });
        var reporter = nodeunit.reporter || nodeunit.reporters[config.reporter];
        reporter.run(nuConf);
    });
});