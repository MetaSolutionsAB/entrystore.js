const nodeunit = require('nodeunit');
import config from './config';
import Auth from './Auth';
import Cache from './Cache';
import Entry from './Entry';
import EntryInfo from './EntryInfo';
import EntryStore from './EntryStore';
import File from './File';
import List from './List';
//import Node from './Node'; // Doing this manually for the time being
import Pipeline from './Pipeline';
import solr from './solr';

    //var deps = config.tests.map( function(cls) {
        //return "tests/"+cls;
    //});
    //if (!has("host-browser") && config.nodeTests) {
        //array.forEach(config.nodeTests, function(cls) {
          //deps.push("store/tests/"+cls);
        //});
    //}
        //var testClasses = Array.prototype.slice.call(arguments, 0);
        //deps.forEach( function(dep, idx) {
            //var test = testClasses[idx];
            //if (test.inGroups) {
                //for (var group in test) if (test.hasOwnProperty(group) && group != "inGroups") {
                    //nuConf[dep+"_"+group] = test[group];
                //}
            //} else {
                //nuConf[dep] = test;
            //}
        //});

        const nuConf = {
          Auth: Auth,
          Cache: Cache,
          Entry: Entry,
          EntryInfo: EntryInfo,
          EntryStore: EntryStore,
          File: File,
          List: List,
          Pipeline: Pipeline,
          solr: solr,
        };

        var reporter = nodeunit.reporter || nodeunit.reporters[config.reporter];
        reporter.run(nuConf);
