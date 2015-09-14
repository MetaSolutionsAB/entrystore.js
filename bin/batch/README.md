# Batch operations using entrystore.js

## Instructions

Write a batch operation as a file, e.g. fix.js.
Then run the batch operation by executing:

    $> node batch.js fix

## Example

You can take inspiration from the included example ´dctermsSpatialLiteralToURI.js´:

* It connects to the specified repository (*).
* It signs in using the admin account and specified password (*). 
* It lists all entries typed as dcat:Catalog
* and converts all literals to uris in statements with predicate dcterms:spatial

(*) These needs to be changed before the batch operation is run.
