var profile = (function(){
    var testResourceRe = /\/tests\//;
    var exclude = /^store\/(node_modules|bin|build|libs|release|samples)\//;
    return {
        resourceTags: {
            ignore: function(filename, mid) {
                return exclude.test(mid);
            },
            test: function(filename, mid) {
                return testResourceRe.test(mid);
            },
            amd: function(filename, mid) {
                return /\.js$/.test(filename) && !testResourceRe.test(mid);
            }
        }
    };
})();