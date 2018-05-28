const fs = require( '../libs/dojo/node!fs');
const nodeunit = require('nodeunit');
import { EntryStore } from '../';
import config from './config';
const Graph = require('rdfjson/Graph');

    var es = new EntryStore(config.repository);
    var c = es.getContextById("1");
    var ready;
    var dct = "http://purl.org/dc/terms/";

    export default nodeunit.testCase({
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
    });
