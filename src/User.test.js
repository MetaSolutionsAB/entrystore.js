import init from '../tests/init.js';
import config from '../tests/config.js';

const { entrystore } = init();
const { adminUser } = config;

describe('User', () => {
  let userEntry;

  afterAll(() => userEntry?.del());

  test('rejects with the server error and keeps the old name when renaming fails', async () => {
    const username = `${new Date().getTime()}`;
    userEntry = await entrystore().newUser(username).commit();
    const user = userEntry.getResource(true);

    const error = await user.setName(adminUser).catch((caught) => caught);

    expect(error.status).toBe(400);
    expect(user.getName()).toBe(username);
  });
});
