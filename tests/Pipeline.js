const lang = require('../libs/dojo/_base/lang');
const has = require('../libs/dojo/has');
import config from './config';
import { EntryStore } from '../';

    var es = new EntryStore(config.repository);
    var c = es.getContextById("1");
    var ready;
    var dct = "http://purl.org/dc/terms/";

    export default nodeunit.testCase({
        setUp: function(callback) {
            if (!ready) {
                es.getAuth().login("Donald", "donalddonald").then(function() {
                    ready = true;
                    callback();
                });
            } else {
                callback();
            }
        },
        pipelineAPI: function(test) {
            var pipeline = c.newPipeline().getResource();
            test.ok(pipeline.getGraph().isEmpty());
            var tr = pipeline.addTransform(pipeline.transformTypes.TABULAR, {key1: "val1"});
            test.ok(!pipeline.getGraph().isEmpty(), "Error, transform not created in graph.");
            test.ok(pipeline.getTransforms().length === 1, "Error, transform not detected correctly in graph.");
            test.ok(pipeline.getTransformType(tr) === pipeline.transformTypes.TABULAR, "Transform type not set correctly in graph.");
            test.ok(pipeline.getTransformArguments(tr).key1 === "val1", "Transform arguments not set correctly in graph.");
            test.done();
        },
        createPipeline: function(test) {
            var protoPipeline = c.newPipeline();
            var pipelineResource = protoPipeline.getResource();
            pipelineResource.addTransform(pipelineResource.transformTypes.TABULAR, {"key1": "value1"});
            protoPipeline.commit().then(function(entry) {
                var pipelineResource2 = entry.getResource(true);
                var transforms = pipelineResource2.getTransforms();
                test.ok(transforms.length > 0);
                test.ok(pipelineResource2.getTransformType(transforms[0]) === pipelineResource2.transformTypes.TABULAR);
                test.done();
            }, function() {
                test.ok(false, "Something went wrong when creating a Pipeline with a single transform.");
            });
        }
    });
