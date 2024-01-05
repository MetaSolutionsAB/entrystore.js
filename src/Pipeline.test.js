import init from '../tests/init.js';

const { context, list } = init(true);

test('Create a pipeline', async () => {
  expect.assertions(2);
  const protoPipeline = context().newPipeline();
  const pipelineResource = protoPipeline.getResource();
  pipelineResource.addTransform(pipelineResource.transformTypes.TABULAR, { key1: 'value1' });
  const entry = await protoPipeline.commit();
  const pipelineResource2 = entry.getResource(true);
  const transforms = pipelineResource2.getTransforms();
  expect(transforms.length).toBeGreaterThan(0);
  expect(pipelineResource2.getTransformType(transforms[0])).toBe(pipelineResource2.transformTypes.TABULAR);
});


test('Check pipeline API', () => {
  expect.assertions(5);
  const pipeline = context().newPipeline().getResource();
  expect(pipeline.getGraph().isEmpty()).toBeTruthy();
  const tr = pipeline.addTransform(pipeline.transformTypes.TABULAR, { key1: 'val1' });
  expect(pipeline.getGraph().isEmpty()).not.toBeTruthy(); // If fail: 'Error, transform not created in graph.');
  expect(pipeline.getTransforms().length).toBe(1); // If fail: 'Error, transform not detected correctly in graph.');
  expect(pipeline.getTransformType(tr)).toBe(pipeline.transformTypes.TABULAR); // If fail: 'Transform type not set correctly in graph.');
  expect(pipeline.getTransformArguments(tr).key1).toBe('val1'); // If fail: 'Transform arguments not set correctly in graph.');
});

test('Set and update arguments of pipeline', async () => {
  expect.assertions(4);
  const protoPipeline = context().newPipeline();
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