require([
    'dojo/_base/array',
    'dojo/has',
  'tests/config'
], function (array, has, config) {

    var deps = array.map(config.tests, function(cls) {
        return "store/tests/"+cls;
    });
    if (!has("host-browser") && config.nodeTests) {
        array.forEach(config.nodeTests, function(cls) {
          deps.push("store/tests/"+cls);
        });
    }
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