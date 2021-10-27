//const { EntryStore, EntryStoreUtil, types } = require('../dist/entrystore.node');
//const config = require('./config');

import EntryStore from './EntryStore';
import EntryStoreUtil from './EntryStoreUtil';
import types from './types';
import config from '../tests/config';

const { repository, adminUser, adminPassword } = config;
const es = new EntryStore(repository);
const esu = new EntryStoreUtil(es);
const MAX_AGE = 86400;


async function logInlogOut()    {
    await es.getAuth().logout();
    await es.getAuth().login(adminUser, adminPassword, MAX_AGE);
}


describe('User with an admin login', () => {
    
    beforeAll(() => {
        return logInlogOut();
    });

    test('Load entries from EntryStore', async () => {
        const adminURI = es.getEntryURI('_principals', '_admin');
        const adminRURI = es.getResourceURI('_principals', '_admin');
        const adminsURI = es.getEntryURI('_principals', '_admins');
        const adminsRURI = es.getResourceURI('_principals', '_admins');
        const guestURI = es.getEntryURI('_principals', '_guest');
        const guestRURI = es.getResourceURI('_principals', '_guest');
        const usersURI = es.getEntryURI('_principals', '_users');
        const usersRURI = es.getResourceURI('_principals', '_users');

        await es.getEntry(adminURI);
        const c = es.getCache();
        if (c.get(adminsURI)) {
          c.unCache(c.get(adminsURI));
        }
        if (c.get(guestURI)) {
          c.unCache(c.get(guestURI));
        }
        if (c.get(usersURI)) {
          c.unCache(c.get(usersURI));
        }
        esu.getEntryByResourceURI(adminsRURI);
        const adminsPromise = c.getPromise(adminRURI);

        // Make sure the state is correct, i.e. four entries, one will be loaded in advance (admin),
        // one will be in the process of being loaded (admins) and two will remain to be loaded (guest and users).
        // If fail: 'Setup of four entries is not correct before load all at once.');

        expect(c.get(adminURI)).toBeTruthy();
        expect(c.get(adminsURI)).not.toBeTruthy();
        expect(c.get(guestURI)).not.toBeTruthy();
        expect(c.get(usersURI)).not.toBeTruthy();
        expect(c.getPromise(adminURI)).not.toBeTruthy();
        expect(c.getPromise(adminsRURI)).toBeTruthy();
        expect(c.getPromise(guestURI)).not.toBeTruthy();
        expect(c.getPromise(usersURI)).not.toBeTruthy();
        
        const fourInOne = esu.loadEntriesByResourceURIs([adminRURI, adminsRURI, guestRURI, usersRURI],
          '_principals');

        // Make sure the state is correct, i.e. four entries, one is loaded in advance (admin),
        // and three are in the process of being loaded (admins, guest and users).
        // If assertion fail: 'Started loading but not seeing 1 already loaded entry and 3 promises');

        expect(c.get(adminURI)).toBeTruthy();
        expect(c.get(adminsURI)).not.toBeTruthy();
        expect(c.get(guestURI)).not.toBeTruthy();
        expect(c.get(usersURI)).not.toBeTruthy();
        expect(c.getPromise(adminRURI)).not.toBeTruthy();
        expect(c.getPromise(adminsRURI)).toBeTruthy();
        expect(c.getPromise(guestRURI)).toBeTruthy();
        expect(c.getPromise(usersRURI)).toBeTruthy();

        // The admins entry has a new promise different from the previous request.
        expect(c.getPromise(adminsRURI)).not.toBe(adminsPromise) // If fail: Got a new promise for request already in progress');
        
        const usersPromise = c.getPromise(usersRURI);
        const results = await fourInOne;

        expect(results.length).toBe(4); // If fail: Did not get exactly 4 entries back'
        expect(results[3].getURI()).toBe(usersURI); // If fail: Got entries back in wrong order

        const users = await usersPromise;
        expect(users.getURI()).toBe(usersURI); // If fail: One of the entries own promise returned the wrong entry
    });
});