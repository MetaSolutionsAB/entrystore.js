import RateLimit from './RateLimit.js';
import init from '../tests/init.js';

const { context, entrystore } = init();

describe('RateLimitation', () => {
  // beforeAll(() => logInlogOut());

  test('Single request', async () => {
    const rl = new RateLimit();
    const result = await rl.enqueue(async () => 'one');
    expect(result).toBe('one')
  });

  test('Single request - failing', async () => {
    const rl = new RateLimit();
    const obj = {a: 'one', b: async function() {throw 'no way'}};
    try {
      const result = await rl.enqueue(obj.b, obj);
    } catch (err) {
      expect(err).toBe('no way');
    }
  });

  test('Single request with parameter', async () => {
    const rl = new RateLimit();
    const result = await rl.enqueue(async param => param, undefined, ['one']);
    expect(result).toBe('one')
  });

  test('Multiple requests', async () => {
    const rl = new RateLimit();
    expect(await rl.enqueue(async () => 'one')).toBe('one');
    expect(await rl.enqueue(async () => 'two')).toBe('two');
    expect(await rl.enqueue(async () => 'three')).toBe('three');
  });

  test('Multiple requests within budget in burst mode', async () => {
    const rl = new RateLimit();
    const before = new Date().getTime();
    await rl.enqueue(async () => 'one');
    await rl.enqueue(async () => 'one');
    await rl.enqueue(async () => 'one');
    const after = new Date().getTime();
    expect(after-before).toBeLessThan(10); // Minimal time have passes since no rate limitation
    expect(rl.waitTime()).toBe(0); // No rate limitation means no wait time for next request
  });

  test('Multiple requests, burst mode - normal', async () => {
    const rl = new RateLimit({timePeriod: 8, requestLimit: 16, bucketCount: 4});
    const before = new Date().getTime();
    expect(await rl.enqueue(async () => 'one')).toBe('one');
    expect(await rl.enqueue(async () => 'two')).toBe('two');
    expect(await rl.enqueue(async () => 'three')).toBe('three');
    expect(await rl.enqueue(async () => 'four')).toBe('four');
    expect(await rl.enqueue(async () => 'five')).toBe('five');
    expect(rl.waitTime()).toBe(0); // We are still within the budget,
    expect(await rl.enqueue(async () => 'six')).toBe('six');
    const after = new Date().getTime();
    const waitTime = rl.waitTime();
   // expect(waitTime).toBeGreaterThan(800); // The budget is now consumed, ratelimitation applies (approx 1 req / sec)
    expect(after-before).toBeLessThan(100); // The six first requests should have been executed very quickly

    const before2 = new Date().getTime();
    expect(await rl.enqueue(async () => 'seven')).toBe('seven');
    const after2 = new Date().getTime();
    expect(after2-before2).toBeGreaterThan(800); // Close to a second of wait time (some time could have been wasted in jest housekeeping calls above since last request)
    expect(rl.waitTime()).toBeGreaterThan(0); // We are still within the same bucket where we consumed the budget and hence rate limitation still applies
    expect(await rl.enqueue(async () => 'eight')).toBe('eight');
    // We have now done two requests after expired budget with a wait time of 1 second each.
    // Hence, we must have passed into next bucket, but unfortunately, we consumed all budget in the first bucket
    // (8 requests leaving 6 requests to be spread out for three coming buckets before we get the previous 8 requests back,
    // but we also need to take into account the situation that all requests are consumed the first millisecond,
    // so we have to subtract 2 more for the current bucket, leaving the new budget to be 0).
    // Consequently, we will still have a requestbudget of 0 and therefore be in rate limitation mode.
    expect(rl.waitTime()).toBeGreaterThan(0);
  });

  test('Multiple requests, burst mode - gready', async () => {
    const rl = new RateLimit({timePeriod: 8, requestLimit: 16, bucketCount: 4, minimumBurstPerBucket: 0});
    const before = new Date().getTime();
    expect(await rl.enqueue(async () => 'one')).toBe('one');
    expect(await rl.enqueue(async () => 'two')).toBe('two');
    expect(await rl.enqueue(async () => 'three')).toBe('three');
    expect(await rl.enqueue(async () => 'four')).toBe('four');
    expect(await rl.enqueue(async () => 'five')).toBe('five');
    expect(rl.waitTime()).toBe(0); // We are still within the budget,
    expect(await rl.enqueue(async () => 'six')).toBe('six');
    const after = new Date().getTime();
    const waitTime = rl.waitTime();
    // expect(waitTime).toBeGreaterThan(800); // The budget is now consumed, ratelimitation applies (approx 1 req / sec)
    expect(after-before).toBeLessThan(100); // The six first requests should have been executed very quickly

    const before2 = new Date().getTime();
    expect(await rl.enqueue(async () => 'seven')).toBe('seven');
    const after2 = new Date().getTime();
    expect(after2-before2).toBeGreaterThan(800); // Close to a second of wait time (some time could have been wasted in jest housekeeping calls above since last request)
    expect(rl.waitTime()).toBeGreaterThan(0); // We are still within the same bucket where we consumed the budget and hence rate limitation still applies
    expect(await rl.enqueue(async () => 'eight')).toBe('eight');
    // We have now done two requests after expired budget with a wait time of 1 second each.
    // Hence, we must have passed into next bucket, but unfortunately, we consumed all budget in the first bucket
    // (8 requests leaving 6 requests to be spread out for three coming buckets before we get the previous 8 requests back,
    // but we also need to take into account the situation that all requests are consumed the first millisecond,
    // so we have to subtract 2 more for the current bucket, leaving the new budget to be 0).
    // Consequently, we will still have a requestbudget of 0 and therefore be in rate limitation mode.
    expect(rl.waitTime()).toBeGreaterThan(0);
  });

  test('Multiple requests in naive mode', async () => {
    const rl = new RateLimit({mode: 'naive', requestLimit: 3600});
    const before = new Date().getTime();
    await rl.enqueue(async () => 'one');
    await rl.enqueue(async () => 'one');
    await rl.enqueue(async () => 'one');
    const after = new Date().getTime();
    expect(after-before).toBeGreaterThanOrEqual(2000); // Minimal time between requests in naive mode is 1000 milliseconds.
    expect(rl.waitTime()).toBeGreaterThan(800);
  });

  test('Multiple requests in naive mode - entrystore', async () => {
    const es = entrystore();
    const adminURI = es.getEntryURI('_principals', '_admin');
    const adminsURI = es.getEntryURI('_principals', '_admins');
    const rl = new RateLimit({mode: 'naive', timePeriod: 1000, requestLimit: 500});
    es.getREST().setRateLimitationForRead(rl);
    const before = new Date().getTime();
    await Promise.all([
      es.getEntry(adminURI, {forceLoad: true}),
      es.getEntry(adminsURI, {forceLoad: true})
    ]);
    const after = new Date().getTime();
    expect(after-before).toBeGreaterThanOrEqual(2000); // Minimal time between requests in naive mode is 2000 milliseconds.
    expect(rl.waitTime()).toBeGreaterThan(800);
    es.getREST().setRateLimitationForRead(undefined);
  });
})