module.exports = {
    tests: [
        "EntryStore",
        "EntryStoreUtil",
        "Auth",
        "Entry",
        "EntryInfo",
        "Cache",
        "List",
        "solr",
        "File",
        "Pipeline",
        // "Inferred",
    ],
    nodeTests: [
      "Node"
    ],
    repository: 'https://g.dev.entryscape.com/store/',
    nonAdminUser: 'giorgos+pp3@metasolutions.se',
    nonAdminPassword: 'stop&go2',
    adminUser: 'admin',
    adminPassword: 'adminadmin',
    contextId: 1,
    entryId: 1,
};
