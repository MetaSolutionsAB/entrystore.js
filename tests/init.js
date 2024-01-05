import EntryStore from '../src/EntryStore.js';
import EntryStoreUtil from '../src/EntryStoreUtil.js';
import config from './config.js';
const { repository, adminUser, adminPassword } = config;
const MAX_AGE = 86400;

export default (includeList) => {
  const es = new EntryStore(repository);
  const esu = new EntryStoreUtil(es);
  const auth = es.getAuth();
  let context;
  let list;

  beforeAll(async () => {
    if (!context) {
      await auth.login(adminUser, adminPassword, MAX_AGE);
      const contextEntry = await es.newContext().commit();
      context = contextEntry.getResource(true);
      if (includeList) {
        list = await context.newList().commit();
        await context.newEntry().setParentList(list).commit();
        await context.newEntry().setParentList(list).commit(); // Not duplicate, but a second entry
      }
    }
  });

  afterAll(async () => {
    const contextEntry = await context.getEntry();
    // Wait so all created entries have been added to solr index before they are removed again
    await new Promise((c) => setTimeout(c, 500));
    await contextEntry.del(true);
    await auth.logout();
  });

  return {context: () => context, entrystore: () => es, list: () => list, entrystoreutil: () => esu};
};