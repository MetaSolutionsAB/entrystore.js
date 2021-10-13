const config = require('./config');
const store = require('../dist/entrystore.node');
const { jsxEmptyExpression } = require('babel-plugin-jest-hoist/node_modules/@babel/types');

const { repository, nonAdminUser, nonAdminPassword } = config;
const es = new store.EntryStore(repository);
const auth = es.getAuth();
const MAX_AGE = 86400;


describe('authorize', () => {
    
    test('cookieSignIn', async () => {
        const data = await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
        expect(data.user).toBe(nonAdminUser);
    });


    test('cookieSignOut', async () => {
        await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
        const data = await auth.logout();
        expect(data.user).toBe('guest'); // If fail:`Failed sign out from account ${nonAdminUser}.`
    });

    test('cookieSignOut', async () => {
        await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
        const data = await auth.logout();
        expect(data.user).toBe('guest'); // If fail:`Failed sign out from account ${nonAdminUser}.`
    });

});

describe('fromGuestListeners', () => {

    async function setUp() {
        await auth.logout();
    };

    beforeEach(setUp);


    test('login', done => {
        expect.assertions(1);
        const authCallback = (topic, data) => {
            if (topic === 'login') {
                expect(data.user).toBe(nonAdminUser);
                done();
                auth.removeAuthListener(authCallback);
            } else {
                done('Could not login');
            }
        };
        auth.addAuthListener(authCallback);
        auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
    });


    test('guestUserEntry', async () => {
        expect.assertions(1);
        //jest.setTimeout(30000);
        return auth.getUserEntry().then((entry) => {
            const name = entry.getResource(true).getName();
            expect(name).toBe('guest');
        });
    });
});

describe('fromUserListeners', () => {

    async function setUpNonAdmin() {
        await auth.login(nonAdminUser, nonAdminPassword, MAX_AGE);
    };

    beforeEach(setUpNonAdmin);

    test('logout', done => {
        expect.assertions(1);
        const authCallback = (topic, data) => {
            if (topic === 'logout') {
                expect(data.user).toBe('guest');
                done();
                auth.removeAuthListener(authCallback);
            }
        };
        auth.addAuthListener(authCallback);
        auth.logout();
    });

    test('signedInUserEntry', async () => {
        const entry = await auth.getUserEntry();
        expect(entry.getResource(true).getName()).toBe(nonAdminUser);
    });
});
