/*global define*/
define([
    'dojo/_base/lang',
	'dojo/_base/array',
	'store/Context'
], function(lang, array, Context) {
	
	/**
     * Solr query module provides a way to create a query by chaining method calls. For example:
     *
     *     solr.title("some title").type("http://example.com/Person")
     *
     * The above example yields a search for entries that have a title that contains "some title" and a rdf:type of
     * "http://example.com/Person" expressed in the metadata.
     *
     * Note that this module is not a class (at least not on the surface as there is no need for using the new keyword).
     * Instead it allows a query object to be constructed by calling one or several methods in a chained fashion.
     * By each method call the query object acumulates information to be sent in the query later. The query is executed
     * behind the scenes by {@link store/EntryStore#getResultList asking the EntryStore for a ResultList} based on the
     * query object.
     *
     * The majority of the methpds work the same way, that is they take two values, a value and a possible negation flag.
     * The value can be an array corresponding to a disjunction and if the flag is set true the search string will be
     * constructed to search for the negatation of the provided value. For example, if a graph type in the form of an
     * array containing List and User is provided together with a negation boolean set to true, the query will
     * search for anything but lists and users:
     *
     *     solr.graphType([types.GT_LIST, types.GT_USER], true)
     *
	 * Supported methods on the solr object following the signature described above, adapted from:
	 * {@link https://code.google.com/p/entrystore/wiki/KnowledgeBaseSearch}
     *
     *  * title - All titles in all languages
     *  * description: All descriptions in all languages
     *  * keyword: All keywords in all languages
     *  * tag: All tags in all languages. Same as keyword, but tag only covers dc:subject
     *  * literal: All literal values, independent of language and datatype
     *  * predicate: All predicate URIs that occur in a resource&apos;s metadata.
     *  * lang: The language of the resource, fetched from dc and dcterms:language. Used for searches.
     *  * all: catch-all Solr field, containing title, description, keywords from above. This field is used if no search property is provided in the Solr query.
     *  * uri: Entry URI
     *  * resource: Resource URI
     *  * rdfType: The RDF type of the resource, fetched from the entry and the metadata graph.
     *  * creator: Creator URI
     *  * contributors: URIs of contributors
     *  * lists: Resource URIs of referring lists
     *  * public: true if the entry metadata is readable by the guest user
     *  * created: Creation date
     *  * modified: Modification date
     *  * graphType: the graph type as used in SCAM, case sensitive (e.g. List, None, ...)
     *  * entryType: the entry type as used in SCAM, case sensitive (e.g. Local, Link, LinkReference?, Reference)
     *  * resourceType: the resource type as used in SCAM, case sensitive
     *  * admin: URIs of principals with admin rights (explicitly set in entry info)
     *  * metadata_r: URIs of principals with read rights on metadata (explicitly set in entry info)
     *  * metadata_rw: URIs of principals with read/write rights on metadata (explicitly set in entry info)
     *  * resource_r: URIs of principals with read rights on the resource (explicitly set in entry info)
     *  * resource_rw: URIs of principals with read/write rights on the resource (explicitly set in entry info)
     *
     * In addition there are a few methods that does not follow the general rule and have been implemented separately
     * and are therefore also documented separately. Those are for setting a context, a limit, the sorting approach and
     * how to restrict to a title with language.
     *
     * There is also a method ({@link store/solr#getQuery getQuery}) for getting the query as a string that is
     * used by EntryStore API behind the scenes, you can safely ignore this method.
     *
     * @namespace store/solr
     */
    var solr = function() {};

    var methods = [
			"title",
			"description",
			"keyword",
			"tag", 
			"literal",
			"predicate", 
			"lang", 
			"all", 
			"uri",
			"resource", 
			"rdfType", 
			"context", 
			"creator", 
			"contributors", 
			"lists", 
			"public", 
			"created", 
			"modified", 
			"entryType",
			"graphType",
			"resourceType",
			"admin",
			"metadata_r",
			"metadata_rw",
			"resource_r",
			"resource_rw"
	];
    
    var map = {
    	entryType: "entryType",
    	graphType: "graphType",
    	resourceType: "resourceType",
    	title_lang: "title.lang",
    	metadata_r: "metadata.r",
    	metadata_rw: "metadata.rw",
    	resource_r: "resource.r",
    	resource_rw: "resource_rw"
    };
    
    array.map(methods, function(method) {
    	solr.prototype[method] = function(val, not) {
    		this["_"+method] = val;
    		if (not === true) {
        		this["_"+method+"_not"] = true;
    		}
    		return this;
    	}
    });
	
    //===========Overwrite some functions with better support for instances as well as strings.
	solr.prototype.context = function(context) {
		this._context = context instanceof Context ? context.getResourceURI() : context.getResourceURI ? context.getResourceURI() : lang.isString(context) && context !== "" ? context : null;
		return this;
	};
	
    /**
     * If a title has a language set, a dynamic field is created with the pattern "title.en", without multi value support. This is used in the context of sorting.
     * @param title {String} the title to search for
     * @param lang {String} the language of the title for instance "en".
     */
	solr.prototype.title_lang = function(title, lang) {
		this._title_lang = {value: title, lang: lang};
		return this;
	};
	
	solr.prototype.limit = function(limit) {
		this._limit = limit;
		return this;
	};
	
	solr.prototype.getLimit = function() {
		return this._limit;
	};
	
	/**
	 * The parameter "sort" can be used for Solr-style sorting, e.g. "sort=title+asc,modified+desc".
	 * The default sorting value is to sort after the score (relevancy) and the modification date. 
	 * All string and non-multi value fields can be used for sorting, this basically excludes title, description and keywords, 
	 * but allows sorting after e.g. title.en.
	 * If no sort is explicitly given the default sort string used is "score+asc".
	 * @param sort {String} a list of fields together with '+asc' or '+desc', first field has the highest priority when sorting.
	 */
	solr.prototype.sort = function(sort) {
		this._sort = sort;
		return this;
	};
	
	solr.prototype.offset = function(offset) {
		this._offset = offset;
		return this;
	};
	
	solr.prototype.getQuery = function(entryStore) {
		var and = [], or, i, j, key;
		if (this._title_lang != null) {
			and.push("title."+this._title_lang.lang + ":"+encodeURIComponent(this._title_lang.value.replace(/:/g,"\\:")));
		}
		for (i=0;i<methods.length;i++) {
			var method = methods[i];
			var v = this["_"+method];
			if (v != null) {
				key = map[method] || method;
				if (lang.isString(v)) {
					if (this["_"+method+"_not"]) {
						and.push("NOT+" + key + ":"+encodeURIComponent(v.replace(/:/g,"\\:")));
					} else {
						and.push(key + ":"+encodeURIComponent(v.replace(/:/g,"\\:")));
					}
				} else if (lang.isArray(v)) {
					or = [];
					for (j=0;j<v.length;j++) {
						var ov = v[j];
						if (lang.isString(ov)) {
							or.push(key + ":"+encodeURIComponent(ov.replace(/:/g,"\\:")));
						}
					}
					if (this["_"+method+"_not"]) {
						and.push("NOT+("+or.join("+OR+")+")");
					} else {
						and.push("("+or.join("+OR+")+")");
					}
				}
			}
		}
		var trail = "";
		if (this._limit != null) {
			trail = "&limit="+this._limit;
		}
		if (this._offset) {
			trail = trail + "&offset="+this._offset;
		}
		if (this._sort) {
			trail = trail + "&sort=" + (this._sort || "score+asc");
		}
		
		return entryStore.getBaseURI()+"search?type=solr&query="+and.join("+AND+")+trail;
	};

    /* We want to avoid writing new solr.title("...").type("...") and instead write:
     * solr.title("...").type("...")
     *
     * To achieve this we need to fiddle with the return value (solr).
     * Rather than returning the class solr we return a object where all methods from the class are available
     * as wrapped methods. Each wrapped method creates an instance and then invokes the same method on that class instance.
     * For example:
     * solr.wrappedMethodCall(...).originalMethodCall1().originalMethodCall2() and so on.
     */
	var c = solr, cp = solr.prototype;
    solr = {};
    array.map(methods, function(method) {
    	solr[method] = function(val, not) {
    		var solr_instance = new c();
    		return solr_instance[method].call(solr_instance, val, not);
    	};
    });
    return solr;
    
    //http://localhost:8080/scam/search?type=solr&query=rdfType:http%5C%3A%2F%2Fdbpedia.org%2Fontology%2FBuilding&sort=score+asc&limit=100
});