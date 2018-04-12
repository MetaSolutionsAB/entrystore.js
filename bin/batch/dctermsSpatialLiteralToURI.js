define([
  'store/EntryStore',
  'dojo/_base/array',
], (EntryStore, array) => {
  const adminPasswd = 'adminadmin';
  const repository = 'http://localhost:8080/store';

  const repo = new EntryStore(repository);
  repo.getAuth().login('admin', adminPasswd).then(() => {
    repo.newSolrQuery().rdfType('http://www.w3.org/ns/dcat#Catalog')
      .limit(100)
      .list()
      .getEntries(0)
      .then((arr) => {
        console.log(`Found ${arr.length} catalogs`);
        array.forEach(arr, (entry) => {
          const md = entry.getMetadata();
          let dirty = false;
          const stmts = md.find(null, 'http://purl.org/dc/terms/spatial');
          array.forEach(stmts, (stmt) => {
            if (stmt.getType() === 'literal') {
              console.log(`Found entry to change ${entry.getURI()}`);
              dirty = true;
              md.add(stmt.getSubject(), stmt.getPredicate(), {
                type: 'uri',
                value: stmt.getValue(),
              });
              md.remove(stmt);
            }
          });
          if (dirty) {
            console.log(`Changing metadata for entry: ${entry.getURI()}`);
            entry.commitMetadata();
          }
        });
      });
  });
});
