require([
  'tests/config'
], function ( config) {

    var deps = config.tests.map( function(cls) {
        return "tests/"+cls;
    });
    //if (!has("host-browser") && config.nodeTests) {
        //array.forEach(config.nodeTests, function(cls) {
          //deps.push("store/tests/"+cls);
        //});
    //}
    require(deps, function() {
        var testClasses = Array.prototype.slice.call(arguments, 0);
        var nuConf = {};
        deps.forEach( function(dep, idx) {
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
