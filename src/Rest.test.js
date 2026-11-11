import http from 'node:http';
import { Readable } from 'node:stream';
import EntryStore from './EntryStore.js';

// A fake repository and a server on another origin, recording the Cookie header of every request.
const SET_COOKIE = 'auth_token=SECRET; Path=/; HttpOnly; Max-Age=86400';
const EXPIRED_COOKIE = 'auth_token=EXPIRED';
// Live sessions whose logout the repository answers with an error status.
const FAILED_LOGOUTS = { 'auth_token=REFUSED': 401, 'auth_token=FAILING': 500 };
let received = [];

const repositoryHandler = (req, res) => {
  const { cookie } = req.headers;
  if (req.url.endsWith('/auth/cookie')) {
    res.setHeader('Set-Cookie', SET_COOKIE);
  }
  if (cookie === EXPIRED_COOKIE) {
    res.statusCode = 401;
  }
  if (req.url.endsWith('/auth/logout') && FAILED_LOGOUTS[cookie]) {
    res.statusCode = FAILED_LOGOUTS[cookie];
  }
  const userInfo = req.headers.cookie
    ? { user: 'donald', id: '1' }
    : { user: 'guest', id: '_guest' };
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(req.url.endsWith('/auth/user') ? userInfo : {}));
};

const otherHandler = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end('{}');
};

const listen = (server, handler) =>
  new Promise((resolve) => {
    const httpServer = http.createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        received.push({
          server,
          method: req.method,
          path: req.url,
          cookie: req.headers.cookie,
        });
        handler(req, res);
      });
    });
    httpServer.listen(0, '127.0.0.1', () => resolve(httpServer));
  });

const originOf = (httpServer) =>
  `http://127.0.0.1:${httpServer.address().port}`;
const receivedBy = (server) =>
  received
    .filter((request) => request.server === server)
    .map(({ method, path, cookie }) => ({ method, path, cookie }));

let repositoryServer;
let otherServer;
let repositoryOrigin;
let otherOrigin;
let es;

beforeAll(async () => {
  repositoryServer = await listen('repository', repositoryHandler);
  otherServer = await listen('other', otherHandler);
  repositoryOrigin = originOf(repositoryServer);
  otherOrigin = originOf(otherServer);
});

afterAll(() => {
  repositoryServer.close();
  otherServer.close();
});

beforeEach(() => {
  received = [];
  es = new EntryStore(`${repositoryOrigin}/store/`);
});

describe('Rest auth cookie', () => {
  test('sends only the token to the repository origin, whatever the path', async () => {
    await es.getAuth().login('donald', 'secret');
    await es.getREST().get(`${repositoryOrigin}/elsewhere`);

    expect(receivedBy('repository')).toEqual([
      { method: 'POST', path: '/store/auth/cookie', cookie: undefined },
      { method: 'GET', path: '/store/auth/user', cookie: 'auth_token=SECRET' },
      { method: 'GET', path: '/elsewhere', cookie: 'auth_token=SECRET' },
    ]);
  });

  test('sends requests to other origins without the cookie', async () => {
    const rest = es.getREST();
    await es.getAuth().login('donald', 'secret');

    await rest.get(`${otherOrigin}/get`);
    await rest.post(`${otherOrigin}/post`, '{}');
    await rest.put(`${otherOrigin}/put`, '{}');
    await rest.del(`${otherOrigin}/del`);
    await rest.putFile(`${otherOrigin}/file`, Readable.from(['data']));

    expect(receivedBy('other')).toEqual([
      { method: 'GET', path: '/get', cookie: undefined },
      { method: 'POST', path: '/post', cookie: undefined },
      { method: 'PUT', path: '/put', cookie: undefined },
      { method: 'DELETE', path: '/del', cookie: undefined },
      { method: 'PUT', path: '/file', cookie: undefined },
    ]);
  });

  test('never sends a cookie set directly on the headers', async () => {
    const rest = es.getREST();
    rest.headers.cookie = 'auth_token=HANDSET';

    await rest.get(`${repositoryOrigin}/store/auth/user`);
    await rest.get(`${otherOrigin}/get`);

    expect(received.map((request) => request.cookie)).toEqual([
      undefined,
      undefined,
    ]);
  });

  test('sends the token on logout, then stops sending it', async () => {
    const auth = es.getAuth();
    await auth.login('donald', 'secret');

    await auth.logout();
    await es.getREST().get(`${repositoryOrigin}/store/auth/user`);

    expect(receivedBy('repository').slice(-2)).toEqual([
      {
        method: 'POST',
        path: '/store/auth/logout',
        cookie: 'auth_token=SECRET',
      },
      { method: 'GET', path: '/store/auth/user', cookie: undefined },
    ]);
    expect(auth.getAuthCookie()).toBeUndefined();
  });

  test('logs out to guest when the server no longer knows the token', async () => {
    const auth = es.getAuth();
    auth.setAuthCookie(EXPIRED_COOKIE);

    const userInfo = await auth.logout();

    expect(userInfo.user).toBe('guest');
    expect(auth.getAuthCookie()).toBeUndefined();
  });

  test.each(Object.entries(FAILED_LOGOUTS))(
    'keeps %s for a retry when logout fails with %i',
    async (cookie, status) => {
      const auth = es.getAuth();
      auth.setAuthCookie(cookie);

      await expect(auth.logout()).rejects.toMatchObject({ status });

      expect(auth.getAuthCookie()).toBe(cookie);
    }
  );
});

describe('Auth setAuthCookie', () => {
  test('binds a saved cookie to the repository origin without its attributes', async () => {
    const auth = es.getAuth();
    const rest = es.getREST();

    auth.setAuthCookie('auth_token=SAVED; Path=/; HttpOnly');
    await rest.get(`${repositoryOrigin}/store/auth/user`);
    await rest.get(`${otherOrigin}/get`);

    expect(auth.getAuthCookie()).toBe('auth_token=SAVED');
    expect(received.map((request) => request.cookie)).toEqual([
      'auth_token=SAVED',
      undefined,
    ]);
  });

  test('replaces a looked-up guest with the saved session', async () => {
    const auth = es.getAuth();
    const guest = await auth.getUserInfo();

    auth.setAuthCookie('auth_token=SAVED');
    const user = await auth.getUserInfo();

    expect([guest.user, user.user]).toEqual(['guest', 'donald']);
  });

  test('lets logout end a saved session after a guest lookup', async () => {
    const auth = es.getAuth();
    await auth.getUserInfo();

    auth.setAuthCookie('auth_token=SAVED');
    await auth.logout();

    expect(receivedBy('repository').at(-1)).toEqual({
      method: 'POST',
      path: '/store/auth/logout',
      cookie: 'auth_token=SAVED',
    });
  });

  test('rejects a value that is not an auth_token cookie', () => {
    expect(() => es.getAuth().setAuthCookie('SAVED')).toThrow(
      'auth_token=<value>'
    );
  });
});

describe('Credentials over plain http', () => {
  test.each([
    'http://localhost:8080/store/',
    'http://127.0.0.1:8080/store/',
    'http://[::1]:8080/store/',
    'https://entrystore.example/store/',
  ])('accepts a saved cookie for %s', (base) => {
    const auth = new EntryStore(base).getAuth();

    auth.setAuthCookie('auth_token=SAVED');

    expect(auth.getAuthCookie()).toBe('auth_token=SAVED');
  });

  test.each([
    'http://entrystore.example/store/',
    'http://192.168.1.10:8080/store/',
  ])('refuses a saved cookie for %s', (base) => {
    const auth = new EntryStore(base).getAuth();

    expect(() => auth.setAuthCookie('auth_token=SAVED')).toThrow(
      'over plain http'
    );
    expect(auth.getAuthCookie()).toBeUndefined();
  });

  test('refuses to log in over plain http to another host', async () => {
    // The host does not exist, so a request that went out would fail with another error.
    const auth = new EntryStore('http://entrystore.example/store/').getAuth();

    await expect(auth.login('donald', 'secret')).rejects.toThrow(
      'Refusing to send credentials to http://entrystore.example over plain http'
    );
  });
});
