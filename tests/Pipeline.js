const { EntryStore } = require('../dist/EntryStore.node');
const config = require('./config');

const { repository, nonAdminUser, nonAdminPassword } = config;
const es = new EntryStore(repository);
const context = es.getContextById('1');
let ready;

exports.Pipeline = {
  setUp(callback) {
    if (!ready) {
      es.getAuth().login(nonAdminUser, nonAdminPassword, MAX_AGE).then(() => {
        ready = true;
        callback();
      });
    } else {
      callback();
    }
  },
  pipelineAPI(test) {
    const pipeline = context.newPipeline().getResource();
    test.ok(pipeline.getGraph().isEmpty());
    const tr = pipeline.addTransform(pipeline.transformTypes.TABULAR, { key1: 'val1' });
    test.ok(!pipeline.getGraph().isEmpty(), 'Error, transform not created in graph.');
    test.ok(pipeline.getTransforms().length === 1, 'Error, transform not detected correctly in graph.');
    test.ok(pipeline.getTransformType(tr) === pipeline.transformTypes.TABULAR, 'Transform type not set correctly in graph.');
    test.ok(pipeline.getTransformArguments(tr).key1 === 'val1', 'Transform arguments not set correctly in graph.');
    test.done();
  },
  createPipeline(test) {
    const protoPipeline = context.newPipeline();
    const pipelineResource = protoPipeline.getResource();
    pipelineResource.addTransform(pipelineResource.transformTypes.TABULAR, { key1: 'value1' });
    protoPipeline.commit().then((entry) => {
      const pipelineResource2 = entry.getResource(true);
      const transforms = pipelineResource2.getTransforms();
      test.ok(transforms.length > 0);
      test.ok(pipelineResource2.getTransformType(transforms[0]) === pipelineResource2.transformTypes.TABULAR);
      test.done();
    }, () => {
      test.ok(false, 'Something went wrong when creating a Pipeline with a single transform.');
    });
  },
};
