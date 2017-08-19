define([
    'dojo/_base/lang',
    'dojo/has',
    'store/EntryStore',
    'tests/config',
    'dojo/node!fs',
], function(lang, has, EntryStore, config, fs) {
	//browsers have the global nodeunit already available

    var es = new EntryStore(config.repository);
    var c = es.getContextById("1");
    var ready;
    var dct = "http://purl.org/dc/terms/";

    return nodeunit.testCase({
        setUp: function(callback) {
            if (!ready) {
                es.auth({user: "Donald", password: "donalddonald"}).then(function() {
                    ready = true;
                    callback();
                });
            } else {
                callback();
            }
        },
        createJSONFile: function(test) {
            c.newEntry().commit().then(function (entry) {
                var r = entry.getResource(true);
                return r.putJSON({a: "v"}).then(function () {
                    entry.setRefreshNeeded(true);
                    return entry.refresh().then(function () {
                        test.ok(entry.getEntryInfo().getFormat() === "application/json", "Mimetype is not application/json as it should.");
                        return r.getJSON().then(function(data) {
                            test.ok(lang.isObject(data) && data.a === "v", "Json not set correctly.");
                            test.done();
                        });
                    });
                });
            }, function () {
                test.ok(false, "Something went wrong when creating a File entry with JSON content.");
            });
        },
        uploadFile: function(test) {
          c.newEntry().commit().then(function (entry) {
            var r = entry.getResource(true);
            return r.putFile(fs.createReadStream('./test.jpg'), 'image/jpg').then(function () {
                entry.setRefreshNeeded(true);
                return entry.refresh().then(function () {
                  test.ok(entry.getEntryInfo().getFormat() === "image/jpg",
                    "Mimetype is not image/jpg it should.");
                  test.ok(entry.getEntryInfo().getSize() > 0, "Binary size is 0.");
                  return r.get().then(function (data) {
                    test.ok(data.length > 0, "Test image is empty.");
                    test.done();
                  });
                });
              });
          }, function () {
            test.ok(false, "Something went wrong when uploading a jpg-file.");
          });
        },
        createTextFile: function(test) {
            c.newEntry().commit().then(function (entry) {
                var r = entry.getResource(true);
                return r.putText("test").then(function () {
                    entry.setRefreshNeeded(true);
                    return entry.refresh().then(function () {
                        test.ok(entry.getEntryInfo().getFormat() === "text/plain", "Mimetype is not text/plain as it should.");
                        return r.getText().then(function(data) {
                            test.ok(lang.isString(data) && data === "test", "Text not set correctly as resource.");
                            test.done();
                        });
                    });
                });
            }, function () {
                test.ok(false, "Something went wrong when creating a Fileentry with text content.");
            });
        },
        createXMLFile: function(test) {
            c.newEntry().commit().then(function (entry) {
                var r = entry.getResource(true);
                var xml = "<book></book>";
                if (has("host-browser")) {
                    var parser=new DOMParser();
                    xml = parser.parseFromString(xml, "text/xml");
                }
                return r.putXML(xml).then(function () {
                    entry.setRefreshNeeded(true);
                    return entry.refresh().then(function () {
                        test.ok(entry.getEntryInfo().getFormat() === "text/xml", "Mimetype is not text/plain as it should.");
                        return r.getXML().then(function (data) {
                            if (has("host-browser")) {
                                test.ok(data instanceof Document && data.firstChild.nodeName === "book",
                                "XML not stored correctly, document contains other xml than sent.");
                                test.done();
                            } else {
                                test.ok(lang.isString(data) && data === "<book></book>", "XMl not set correctly as a resource.");
                                test.done();
                            }
                        });
                    });
                });
            }, function () {
                test.ok(false, "Something went wrong when creating a File entry with xml content.");
            });
        }
    });
});