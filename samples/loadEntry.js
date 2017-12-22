require(['store/samples/config', 'store/EntryStore'], function(config, EntryStore) {
  var es = new EntryStore(config.repository);
  var entryURI = es.getEntryURI(config.contextId, config.entryId);
  es.getEntry(entryURI).then(function(entry) {
    alert("Loaded entry with title: " + entry.getMetadata().findFirstValue(null, "http://purl.org/dc/terms/title"));
  }, function(err) {
    alert("Failure to load entry: " + err);
  });
});