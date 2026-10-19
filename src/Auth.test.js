import EntryStore from './EntryStore.js';
import config from '../tests/config.js';

const { repository, nonAdminUser, nonAdminPassword } = config;
const es = new EntryStore(repository);
const auth = es.getAuth();
const MAX_AGE = 86400;

// Resolves with the next auth event, then stops listening.
const nextAuthEvent = () =>
  new Promise((resolve) => {
    const authCallback = (topic, data) => {
      auth.removeAuthListener(authCallback);
      resolve({ topic, data });
    };
    auth.addAuthListener(authCallback);
  });

describe('Signing in and out using cookies', () => {
  test('Sign in with cookies', async () => {
    const data = await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
    expect(data.user).toBe(nonAdminUser);
  });

  test('Sign out with cookies', async () => {
    await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
    const data = await auth.logout();
    expect(data.user).toBe('guest'); // If fail:`Failed sign out from account ${nonAdminUser}.`
  });
});

describe('Authentication using a guest profile', () => {
  async function setUp() {
    await auth.logout();
  }

  beforeEach(setUp);

  test('Signing in', async () => {
    const authEvent = nextAuthEvent();

    await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
    const { topic, data } = await authEvent;

    expect(topic).toBe('login');
    expect(data.user).toBe(nonAdminUser);
  });

  test('Check user entry is guest', async () => {
    expect.assertions(1);
    const entry = await auth.getUserEntry();
    const name = entry.getResource(true).getName();
    expect(name).toBe('guest');
  });
});

describe('Authentication using a user profile', () => {
  async function setUpNonAdmin() {
    await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
  }

  beforeEach(setUpNonAdmin);

  test('Signing out', async () => {
    const authEvent = nextAuthEvent();

    await auth.logout();
    const { topic, data } = await authEvent;

    expect(topic).toBe('logout');
    expect(data.user).toBe('guest');
  });

  test('Check authentication entry is a user profile', async () => {
    const entry = await auth.getUserEntry();
    expect(entry.getResource(true).getName()).toBe(nonAdminUser);
  });
});
