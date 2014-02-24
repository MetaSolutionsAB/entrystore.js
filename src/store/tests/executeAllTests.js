require([
    'dojo/_base/array',
    'tests/config'
], function (array, config) {

    var deps = array.map(config.tests, function(cls) {
        return "store/tests/"+cls;
    });
    require(deps, function() {
        var testClasses = Array.prototype.slice.call(arguments, 0);
        var nuConf = {};
        array.forEach(deps, function(dep, idx) {
            var test = testClasses[idx];
            if (test.inGroups) {
                for (var group in test) if (test.hasOwnProperty(group) && group != "inGroups") {
                    nuConf[dep+"_"+group] = test[group];
                }
            } else {
                nuConf[dep] = test;
            }
        });
        var reporter = nodeunit.reporter || nodeunit.reporters[config.reporter];
        reporter.run(nuConf);
    });
});