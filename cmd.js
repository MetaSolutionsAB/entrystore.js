/*global define*/
define(["store/EntryStore", "store/Entry", "store/Resource", "rdfjson/print", "store/solr"], function(EntryStore, Entry, Resource, rdfprint, solr) {
    // The following code only works in node.js as it depends on repl and vm being available as global variables.
    // Tested against version 0.6.10

    var own_cmd = false;
    var padding = "  ==>   ";
    var l = function(m) {
        console.log(padding+m)
    };
    var lt = function(m1, len, m2) {
        while(m1.length < len) {
            m1 += " ";
        }
        console.log(padding+m1+m2);
    };


    var es_eval = function(cmd, context, filename, callback) {
        var f = function(result) {
            if (result == null) {
                return false;
            } else if (result.getResourceURI) { //Check if Entry
                context.e = result;
                callback(padding+"Variable 'e' now points to the entry: \""+result.getURI()+"\"\n", result);
                return true;
            } else if (result.getOwnEntryURI) {
                result.getOwnEntry().then(function(entry) {
                    context.e = entry;
                    callback(padding+"Variable 'e' now points to the entry: \""+entry.getURI()+"\"\n", result);
                });
                return true;
            } else if ((result instanceof Array || typeof result == "array") && result.length > 0 && result[0].getResourceURI) { // Check if array of entries.
                l("---------------------------------------------------------------------------------------");
                for (var i=0;i<result.length;i++) {
                    l("["+(context._list_offset+i)+"]  "+result[i].getURI());
                }
                context._list_offset = 0;
                l("---------------------------------------------------------------------------------------");
                context.result = result;
                callback(padding+"Variable 'result' contains the result of the command.\n", result);
                return true;
            }
        };

        try {
            if (cmd.indexOf("(undefined") != -1) {
                callback(null);
                return;
            }
            cmd = cmd.replace(/;(\r\n|\r|\n)\)/g, ")");
            var script = vm.createScript(cmd);              //Use of global variable vm
            var result = script.runInNewContext(context);
            var _own_cmd = own_cmd;
            own_cmd = false;
            context.last = result;
            if (result && result.then) {  //A promise
                result.then(function(presult) {
                    if (_own_cmd) {
                        callback(" ", presult);
                    } else if (f(presult)) {
                        //Do nothing, see f above.
                    } else if (presult) {
                        context.result = presult;
                        callback(padding+"Variable 'result' contains the result of the command.", presult);
                    } else {
                        callback(null);
                    }
                }, function(err) {
                    callback(padding+"Error: "+err);
                });
            } else {
                if (cmd.match(/[^=<>!]=[^=<>!]/) !== null) {
                    callback(" ", result);        //Assignment, do not print the value, recognize entry, resource or array of entries.
                } else if (cmd.match(/\([ecor]\s*\)/)) {
                   callback(null, result);     //User wanted to print one of 'e' 'c' 'o' or 'r' variables, do that.
                } else if(f(result)) {
                    //Do nothing, already recognized entry, resource or array of entries, see f above.
                } else {
                    callback(null, result);  //Nothing special, print the value
                }
            }
        } catch(e) {
            callback(padding+"Error: "+e);
        }
    };
    console.log("\n   ---------------------------------------------------------------------------");
    console.log("  | Welcome to the EntryStore Shell, to get help with commands type 'help()'  |");
    console.log("   ---------------------------------------------------------------------------\n");
    var rep;
    if (process.argv.length > 2) {
        l("Repository, available in variable 'r', set from command line to: \""+process.argv[2]+"\"\n");
    }

    if (process.argv.length > 4) {
        l("Basic authentication provided.");
    }

    var context = repl.start("ES> ", null, es_eval, false, true).context;   //Use of global variable repl
    if (process.argv.length > 2) {
        context.r = new EntryStore(process.argv[2]);
    }
    if (process.argv.length > 4) {
        context.r.auth("basic", {user: process.argv[3], password: process.argv[4]});
    }
    context.solr = solr;

    context.repository = function(url) {
        own_cmd = true;
        context.r = new EntryStore(url);
        l("Variable 'r' contains the current respository, that is: \""+url+"\"");
    };

    context.auth = function(user, password) {
        own_cmd = true;
        if (context.r == null) {
            l("You need to set the current repository first.\n");
        } else {
            context.r.auth("basic", {user: user, password: password});
            l("Credentials set using basic auth");
        }
    };

    context.context = function(cId) {
        own_cmd = true;
        if (context.r == null) {
            l("You need to set the current repository first.\n");
        } else {
          var uri = context.r.getBaseURI()+"_contexts/entry/"+cId;
          return context.r.getEntry(uri).then(function(entry) {
              context.o = entry;
              context.c = entry.getResource();
              l("Variable 'c' contains the current context, that is: \""+ entry.getResourceURI()+"\"");
              l("Variable 'o' contains the current contexts own entry, that is \""+entry.getURI()+"\"");
              return entry;
          }, function(err) {
              l("Failed loading context: "+err+"\n");
          });
      }
    };

    context.entry = function(eId) {
        own_cmd = true;
        if (context.r == null) {
            l("You need to set current repository first.\n");
        } else if (context.c == null) {
            l("You need to set current context first.\n");
        } else {
            var uri = context.c.getOwnResourceURI()+"/entry/"+eId;
            return context.r.getEntry(uri).then(function(entry) {
                context.e = entry;
                l("Variable 'e' contains the current entry, that is: \""+entry.getURI()+"\"");
                return entry;
            }, function(err) {
                l("Failed loading entry: "+err+"\n");
            });
        }
    };

    var mprint = function(graph, entry, term) {
        if (graph) {
            var pretty = rdfprint.pretty(graph, entry.getResourceURI());
            l("Pretty printing of "+term+" metadata for entry "+entry.getId()+" in context "+ entry.getContext().getId());
            l("---------------------------------------------------------------------------------------");
            for (var key in pretty) {
                if (pretty.hasOwnProperty(key)) {
                    l("\""+key+"\": \""+ pretty[key]+"\"");
                }
            }
            l("---------------------------------------------------------------------------------------");
            return true;
        }
    };
    context.mprint = function(e) {
        own_cmd = true;
        if (!e) {
            if (context.e) {
                e = context.e;
            } else {
                l("You need to set the entry, or provide an entry as input.\n");
                return;
            }
        } else if (!e instanceof Entry) {
            l("You need to provide an instance of the class store.Entry to print metadata.\n");
            return;
        }

        var lmd = mprint(e.getMetadata(), e, "local");
        var cemd = mprint(e.getCachedExternalMetadata(), e, "cached external");
        if (!lmd && !cemd) {
            l("Neither local or cached external metadata for entry "+ e.getId() + " in context "+ e.getContext().getId()+"\n");
        } else {
            l("To see what the abbreviated namespaces expands to type 'namespaces()'\n");
        }
    };

    context.namespaces = function() {
        own_cmd = true;
        var nss = rdfprint.getNamespaces();
        l("The following namespaces are registered in this session right now:");
        l("---------------------------------------------------------------------------------------");
        for (var ns in nss) {
            if (nss.hasOwnProperty(ns)) {
                l("\""+ns+"\": \""+ nss[ns]+"\"");
            }
        }
        l("---------------------------------------------------------------------------------------\n");
    };

    context.ls = function(page) {
        return context.page(page);
    };

    context.page = function(page) {
        if (!context.e) {
            l("You need to set the current entry, i.e. variable 'e'.\n");
            return;
        } else if (!context.e.isList()) {
            l("The current entry, \""+ context.e.getURI()+"\" is not a list.");
            return
        }
        page = isNaN(page) ? 0 : page-1;
        if (page<0) {
            l("Page numbers starts from 1.\n");
            return;
        }

        var list = context.e.getResource();
        return list.getEntries(page).then(function(children) {
            context._list_offset = page*list.getLimit();
            if (context._list_offset > list.getSize()) {
                l("Showing no entries as the page is out of range, there are only "+ Math.ceil(list.getSize() / list.getLimit()) +" pages with in total "+list.getSize()+" entries in list \""+list.getOwnEntryURI()+"\"\n");
                return;
            } else {
                l("Showing entry "+(context._list_offset) +" to entry "+(context._list_offset+children.length-1)+" in the List \""+list.getOwnEntryURI()+"\"");
                l("There are in total "+list.getSize()+" entries in list.");
            }
            return children;
        });
    };
    context._list_offset = 0; //Only relevant first time.

    context.help = function() {
        var w = 25;
        l("The following methods are available to you in addition to the storejs API:")
        l("---------------------------------------------------------------------------------------");
        lt("respository(baseuri)", w, "Switches respository");
        lt("context(contextId)", w, "Switches context, requires respository to be set");
        lt("entry(entryId)", w, "Switches, requires a repository and context to be set");
        lt("mprint(entry)", w, "Prints simplified metadata about the current entry, or the entry provided");
        lt("namespaces()", w, "Prints a list of namespace abbreviations used in mprint");
        lt("page(nr)", w, "Lists entries at page nr of current entry (if it is a list, otherwise it gives a warning)\n");
        l("The following variables are available to you:")
        l("---------------------------------------------------------------------------------------");
        w = 10;
        lt("r", w, "The current repository, updated by the repository method");
        lt("c", w, "The current context resource, updated by the context method");
        lt("o", w, "The current context entry, updated by the context method");
        lt("e", w, "The current entry, updated by the entry method and every other method that results in an entry or the resource of an entry");
        lt("last", w, "The result of the last command, independent of what it was.");
        lt("result", w, "If the last command resulted in a promise (a sort of callback), the result variable holds what is returned in this callback");
    }
});
