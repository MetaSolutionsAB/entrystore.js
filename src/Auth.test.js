import EntryStore from './EntryStore.js';
import config from '../tests/config.js';

const { repository, nonAdminUser, nonAdminPassword } = config;
const es = new EntryStore(repository);
const auth = es.getAuth();
const MAX_AGE = 86400;

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


  test('Signing in', (done) => {
    expect.assertions(2);
    const authCallback = (topic, data) => {
      expect(topic).toBe('login');
      expect(data.user).toBe(nonAdminUser);
      done();
      auth.removeAuthListener(authCallback);
    };
    auth.addAuthListener(authCallback);
    auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
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

  test('Signing out', (done) => {
    expect.assertions(2);
    const authCallback = (topic, data) => {
      expect(topic).toBe('logout');
      expect(data.user).toBe('guest');
      done();
      auth.removeAuthListener(authCallback);
    };
    auth.addAuthListener(authCallback);
    auth.logout();
  });

  test('Check authentication entry is a user profile', async () => {
    const entry = await auth.getUserEntry();
    expect(entry.getResource(true).getName()).toBe(nonAdminUser);
  });
});
