const { EntryStore } = require('../dist/entrystore.node');
const config = require('./config');

const { repository, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
let context;
let finished = false;
const MAX_AGE = 86400;

const setUp = async (callback) => {
  if (!context) {
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword, MAX_AGE);
    const contextEntry = await es.newContext().commit();
    context = contextEntry.getResource(true);
  }
  callback();
};

const tearDown = async (callback) => {
  if (finished) {
    try {
      const contextEntry = await context.getEntry();
      await contextEntry.del(true);

      const auth = es.getAuth();
      await auth.logout();
    } catch (err) {
      // console.error(err);
    }
  }
  callback();
};
exports.Pipeline = {
  setUp,
  tearDown,
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
  async createPipeline(test) {
    const protoPipeline = context.newPipeline();
    const pipelineResource = protoPipeline.getResource();
    pipelineResource.addTransform(pipelineResource.transformTypes.TABULAR, { key1: 'value1' });
    let entry;
    try {
      entry = await protoPipeline.commit();
    } catch (err) {
      test.ok(false, 'Something went wrong when creating a Pipeline with a single transform.');
    }
    const pipelineResource2 = entry.getResource(true);
    const transforms = pipelineResource2.getTransforms();
    test.ok(transforms.length > 0);
    test.ok(pipelineResource2.getTransformType(transforms[0]) === pipelineResource2.transformTypes.TABULAR);
    test.done();
    finished = true;
  },
  async setAndUpdateArguments(test) {
    const protoPipeline = context.newPipeline();
    const pipelineResource = protoPipeline.getResource();
    const args = {
      validation: 'strict',
      harvesting: 'lax',
      enabled: 'off',
    };

    const argsTyped = {
      typed: 'yes',
    };

    pipelineResource.setPipelineArguments(args, 'configuration');
    pipelineResource.setPipelineArguments(argsTyped, 'transform');

    let entry;
    try {
      entry = await protoPipeline.commit();
    } catch (err) {
      test.ok(false, 'Something went wrong when creating a Pipeline with some configuration arguments.');
    }

    const pipelineResource2 = entry.getResource(true);
    const configurationArgs = pipelineResource2.getPipelineArguments('configuration');
    const transformArgs = pipelineResource2.getPipelineArguments('transform');
    const allArgs = pipelineResource2.getPipelineArguments();
    test.deepEqual(configurationArgs, args);
    test.deepEqual(transformArgs, argsTyped);
    test.deepEqual(allArgs, { ...args, ...argsTyped });


    args.validation = 'lax';
    pipelineResource2.setPipelineArguments(args, 'configuration');
    try {
      await pipelineResource2.commit();
    } catch (err) {
      test.ok(false, 'Something went wrong when updating Pipeline arguments.');
    }

    const configArgs = pipelineResource2.getPipelineArguments('configuration');
    test.equal(configArgs.validation, 'lax');

    test.done();
  },
};
