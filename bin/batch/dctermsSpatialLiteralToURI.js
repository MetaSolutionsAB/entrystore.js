define(["store/EntryStore", "store/solr", "dojo/_base/array"], function(EntryStore, solr, array) {

    var adminPasswd = "adminadmin";
    var repository = "http://localhost:8080/store";
    
    var repo = new EntryStore(repository);
    repo.getAuth().login("admin", adminPasswd).then(function() {
	repo.createSearchList(solr.rdfType("http://www.w3.org/ns/dcat#Catalog").limit(100)).getEntries(0).then(function(arr) {
	    console.log("Found "+arr.length+ " catalogs");
	    array.forEach(arr, function(entry) {
		var md = entry.getMetadata();
		var dirty = false;
		var stmts = md.find(null, "http://purl.org/dc/terms/spatial");
		array.forEach(stmts, function(stmt) {
		    if (stmt.getType() === "literal") {
			console.log("Found entry to change "+entry.getURI());
			dirty = true;
			md.add(stmt.getSubject(), stmt.getPredicate(), {type: "uri", value: stmt.getValue()});
			md.remove(stmt);
		    }
		});
		if (dirty) {
		    console.log("Changing metadata for entry: "+entry.getURI());
		    entry.commitMetadata();
		}
	    });
	});
    });
});
