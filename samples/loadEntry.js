const es = new EntryStore.EntryStore(config.repository);
const entryURI = es.getEntryURI(config.contextId, config.entryId);
es.getEntry(entryURI).then((entry) => {
  alert(`Loaded entry with title: ${entry.getMetadata().findFirstValue(null, 'http://purl.org/dc/terms/title')}`);
}, (err) => {
  alert(`Failure to load entry: ${err}`);
});
