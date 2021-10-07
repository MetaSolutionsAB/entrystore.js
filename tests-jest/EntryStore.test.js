const { EntryStore } = require('../dist/entrystore.node');
const config = require('./config');

const { repository, contextId, entryId, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const MAX_AGE = 86400;


/*
* Auxilary functions for setups
*/

async function logOut() {
    await es.getAuth().logout()
};

async function logInlogOut()    {
    await es.getAuth().logout();
    await es.getAuth().login(adminUser, adminPassword, MAX_AGE);
}

describe('tests that require logout', () => {
    

    // ändra till before så att det händer en gång bara före alla tester
    beforeEach(() => {
        return logOut();
    });

    test('initStore test', () => {
        expect(es.getBaseURI()).toBe(repository);
    });


    test('getEntry test finish with success', async () => {
        const entry = await es.getEntry(`${repository}${contextId}/entry/${entryId}`);
        expect(entry).not.toBeNull(); 
    });

    test('getContext', () => {
        const c = es.getContextById('1');
        expect(c.getId()).toBe('1');
    });
});




describe('tests that require login', () => {


    // ändra till before så att det händer en gång bara före alla tester
    beforeEach(() => {
        return logInlogOut();
    });

    /*
    * to send custom messages based on excpected result
    * lib https://github.com/mattphillips/jest-expect-message
    * seems to be needed OR expect.extend(matchers) see Jest API
    */

    test('asyncListenerLogout', done => {
        expect.assertions(1);
        const asyncListener = async (promise, callType) => {
            expect(callType).toBe('logout'); //if fail: Wrong calltype, should be 'logout'
            try {
                await promise;
                done();
            } catch (err) {
                done(err);
            }
          };
        es.addAsyncListener(asyncListener);
        es.getAuth().logout();
        es.removeAsyncListener(asyncListener);
    });


    test('getContextList', async () => {
        expect.assertions(1);
        const entries = await es.getContextList().getEntries();
        expect(entries.length).toBeGreaterThan(0); // if fail: No contexts found.
    });

    test('getPrincipalList', async () => {
        expect.assertions(1);
        const plist = es.getPrincipalList();
        const entries = await plist.getEntries();
        expect(entries.length).toBeGreaterThan(0); // if fail: No principals found
    });


    test('createContext', async () => {
        expect.assertions(1);
        const entry = await es.newContext().commit();
        expect(entry.isContext()).toBeTruthy(); // if fail: Entry created, but it is not a context

    });


    test('createUser', async () => {
        expect.assertions(2);
        const username = `${new Date().getTime()}`;
        const entry = await es.newUser(username).commit();
        expect(entry.isUser()).toBeTruthy(); // if fail: Entry created, but it is not a user!
        expect(entry.getResource(true).getName()).toBe(username); //if fail: User created, but username provided in creation step is missing.
    });


    test('createGroup', async () => {
        expect.assertions(1);
        const entry = await es.newGroup().commit();
        expect(entry.isGroup()).toBeTruthy(); // if fail: Entry created, but it is not a group!
    });


    // Bertrand Russel would be proud of this entry
    test('singleRequestInCache', async () => {
        expect.assertions(7);
        const contextsEntryURI = es.getEntryURI('_contexts', '_contexts');
        const cache = es.getCache();
        const contextEntry = cache.get(contextsEntryURI);
        if (contextEntry) {
            cache.unCache(contextEntry);
        }
        expect(cache.get(contextsEntryURI)).toBe(undefined); // if fail: Alredy something in cache for explicitly uncached entry
        expect(cache.getPromise(contextsEntryURI)).toBe(undefined); // if fail: Alredy a promise in cache before requesting it
        const promise1 = es.getEntry(contextsEntryURI);
        const promise2 = es.getEntry(contextsEntryURI);
        expect(promise1).toBe(promise2); // if fail: Not reusing same promise for same entry.
        expect(cache.get(contextsEntryURI)).toBe(undefined); // if fail: Entry in cache without delay.'
        expect(cache.getPromise(contextsEntryURI)).not.toBe(undefined); // if fail: 'No promise in cache for requested entry.'
        await promise1;
        expect(cache.getPromise(contextsEntryURI)).toBe(undefined); // if fail: romise remains in cache after entry returned.
        expect(cache.get(contextsEntryURI)).not.toBe(undefined); // if fail: 'Entry not in cache after being returned'
    });
});

   