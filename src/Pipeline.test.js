import EntryStore from './EntryStore';
import config from '../tests/config';

const { repository, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
let context;
const MAX_AGE = 86400;

async function setUp() {
  if (!context) {
    const auth = es.getAuth();
    await auth.logout();
    await auth.login(adminUser, adminPassword, MAX_AGE);
    const contextEntry = await es.newContext().commit();
    context = contextEntry.getResource(true);
  }
};

async function tearDown() {
  const contextEntry = await context.getEntry();
  await contextEntry.del(true);

  const auth = es.getAuth();
  await auth.logout();
};


beforeAll(setUp);
afterAll(tearDown);

test('Create a pipeline', async () => {
  const protoPipeline = context.newPipeline();
  const pipelineResource = protoPipeline.getResource();
  pipelineResource.addTransform(pipelineResource.transformTypes.TABULAR, { key1: 'value1' });
  const entry = await protoPipeline.commit();
  const pipelineResource2 = entry.getResource(true);
  const transforms = pipelineResource2.getTransforms();
  expect(transforms.length).toBeGreaterThan(0);
  expect(pipelineResource2.getTransformType(transforms[0])).toBe(pipelineResource2.transformTypes.TABULAR);
});


test('Check pipeline API', () => {
  const pipeline = context.newPipeline().getResource();
  expect(pipeline.getGraph().isEmpty()).toBeTruthy();
  const tr = pipeline.addTransform(pipeline.transformTypes.TABULAR, { key1: 'val1' });
  expect(pipeline.getGraph().isEmpty()).not.toBeTruthy(); // If fail: 'Error, transform not created in graph.');
  expect(pipeline.getTransforms().length).toBe(1); // If fail: 'Error, transform not detected correctly in graph.');
  expect(pipeline.getTransformType(tr)).toBe(pipeline.transformTypes.TABULAR); // If fail: 'Transform type not set correctly in graph.');
  expect(pipeline.getTransformArguments(tr).key1).toBe('val1'); // If fail: 'Transform arguments not set correctly in graph.');
});

test('Set and update arguments of pipeline', async () => {
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

  const entry = await protoPipeline.commit();

  const pipelineResource2 = entry.getResource(true);
  const configurationArgs = pipelineResource2.getPipelineArguments('configuration');
  const transformArgs = pipelineResource2.getPipelineArguments('transform');
  const allArgs = pipelineResource2.getPipelineArguments();
  expect(configurationArgs).toEqual(args);
  expect(transformArgs).toEqual(argsTyped);
  expect(allArgs).toEqual({ ...args, ...argsTyped });


  args.validation = 'lax';
  pipelineResource2.setPipelineArguments(args, 'configuration');
  await pipelineResource2.commit();

  const configArgs = pipelineResource2.getPipelineArguments('configuration');
  expect(configArgs.validation).toEqual('lax');
});