/*global define*/
define([
    'dojo/_base/lang',
	'dojo/_base/array',
	'store/Context'
], function(lang, array, Context) {
	
	var c = function() {
	};
	var cp = c.prototype;

	/**
	 * Supported methods on the solr object, adapted from:
	 * https://code.google.com/p/entrystore/wiki/KnowledgeBaseSearch
	 * 
     * title: All titles in all languages
     * description: All descriptions in all languages
     * keyword: All keywords in all languages
     * tag: All tags in all languages. Same as keyword, but tag only covers dc:subject
     * literal: All literal values, independent of language and datatype
     * predicate: All predicate URIs that occur in a resource's metadata.
     * lang: The language of the resource, fetched from dc and dcterms:language. Used for searches.
     * all: catch-all Solr field, containing title, description, keywords from above. This field is used if no search property is provided in the Solr query.
     * uri: Entry URI
     * resource: Resource URI
     * rdfType: The RDF type of the resource, fetched from the entry and the metadata graph.
     * context: Resource URI of the entry's surrounding context
     * creator: Creator URI
     * contributors: URIs of contributors
     * lists: Resource URIs of referring lists
     * public: true if the entry metadata is readable by the guest user
     * created: Creation date
     * modified: Modification date
     * builtinType: the builtin type as used in SCAM, case sensitive (e.g. List, None, ...)
     * locationType: the location type as used in SCAM, case sensitive (e.g. Local, Link, LinkReference?, Reference)
     * representationType: the representation type as used in SCAM, case sensitive
     * admin: URIs of principals with admin rights (explicitly set in entry info)
     * metadata_r: URIs of principals with read rights on metadata (explicitly set in entry info)
     * metadata_rw: URIs of principals with read/write rights on metadata (explicitly set in entry info)
     * resource_r: URIs of principals with read rights on the resource (explicitly set in entry info)
     * resource_rw: URIs of principals with read/write rights on the resource (explicitly set in entry info)
     */
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
			"representationType",
			"admin",
			"metadata_r",
			"metadata_rw",
			"resource_r",
			"resource_rw"
	];
    
    var map = {
    	entryType: "entryType",
    	graphType: "graphType",
    	resourceType: "representationType",
    	title_lang: "title.lang",
    	metadata_r: "metadata.r",
    	metadata_rw: "metadata.rw",
    	resource_r: "resource.r",
    	resource_rw: "resource_rw"
    };
    
    array.map(methods, function(method) {
    	cp[method] = function(val, not) {
    		this["_"+method] = val;
    		if (not === true) {
        		this["_"+method+"_not"] = true;
    		}
    		return this;
    	}
    });
	
    //===========Overwrite some functions with better support for instances as well as strings.
	cp.context = function(context) {
		this._context = context instanceof Context ? context.getOwnResourceURI() : context.getResourceURI ? context.getResourceURI() : lang.isString(context) && context !== "" ? context : null;
		return this;
	};
	
    /**
     * If a title has a language set, a dynamic field is created with the pattern "title.en", without multi value support. This is used in the context of sorting.
     * @param title {String} the title to search for
     * @param lang {String} the language of the title for instance "en".
     */
	cp.title_lang = function(title, lang) {
		this._title_lang = {value: title, lang: lang};
		return this;
	};
	
	cp.limit = function(limit) {
		this._limit = limit;
		return this;
	};
	
	cp.getLimit = function() {
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
	cp.sort = function(sort) {
		this._sort = sort;
		return this;
	};
	
	cp.offset = function(offset) {
		this._offset = offset;
		return this;
	};
	
	cp.getQuery = function(entryStore) {
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
	
	var solr = {};
    array.map(methods, function(method) {
    	solr[method] = function(val, not) {
    		var solri = new c();
    		return solri[method].call(solri, val, not);
    	};
    });
    return solr;
    
    //http://localhost:8080/scam/search?type=solr&query=rdfType:http%5C%3A%2F%2Fdbpedia.org%2Fontology%2FBuilding&sort=score+asc&limit=100
});