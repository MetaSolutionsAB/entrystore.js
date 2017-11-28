define([
  'dojo/_base/lang',
  'dojo/_base/array',
  'rdfjson/namespaces',
  'store/SearchList',
  'store/Context',
  'md5',
], (lang, array, namespaces, SearchList, Context, md5) => {
  /**
   * Solr query module provides a way to create a query by chaining method calls. For example:
   *
   *     solr.title("some title").type("http://example.com/Person")
   *
   * The above example yields a search for entries that have a title that contains "some title"
   * and a rdf:type of "http://example.com/Person" expressed in the metadata.
   *
   * Note that this module is not a class (at least not on the surface as there is no need for
   * using the new keyword). Instead it allows a query object to be constructed by calling one or
   * several methods in a chained fashion. By each method call the query object acumulates
   * information to be sent in the query later. The query is executed behind the scenes by
   * {@link store/EntryStore#getResultList asking the EntryStore for a ResultList} based on the
   * query object.
   *
   * The majority of the methpds work the same way, that is they take two values, a value and a
   * possible negation flag. The value can be an array corresponding to a disjunction and if the
   * flag is set true the search string will be constructed to search for the negatation of the
   * provided value. For example, if a graph type in the form of an array containing List and User
   * is provided together with a negation boolean set to true, the query will search for anything
   * but lists and users:
   *
   *     solr.graphType([types.GT_LIST, types.GT_USER], true)
   *
   * Supported methods on the solr object following the signature described above, adapted from:
   * {@link https://code.google.com/p/entrystore/wiki/KnowledgeBaseSearch}
   *
   * title: All titles in all languages
   * description: All descriptions in all languages
   * keyword: All keywords in all languages
   * tag: All tags in all languages. Same as keyword, but tag only covers dc:subject
   * literal: All literal values, independent of language and datatype
   * predicate: All predicate URIs that occur in a resource&apos;s metadata.
   * lang: The language of the resource, fetched from dc and dcterms:language. Used for searches.
   * all: catch-all Solr field, containing title, description, keywords from above. This field is
   *   used if no search property is provided in the Solr query.
   * uri: Entry URI
   * resource: Resource URI
   * rdfType: The RDF type of the resource, fetched from the entry and the metadata graph.
   * creator: Creator URI
   * contributors: URIs of contributors
   * lists: Resource URIs of referring lists
   * public: true if the entry metadata is readable by the guest user
   * created: Creation date
   * modified: Modification date
   * graphType: the graph type as used in SCAM, case sensitive (e.g. List, None, ...)
   * entryType: the entry type as used in SCAM, case sensitive (e.g. Local, Link,
   *   LinkReference?, Reference)
   * resourceType: the resource type as used in SCAM, case sensitive
   * admin: URIs of principals with admin rights (explicitly set in entry info)
   * metadata_r: URIs of principals with read rights on metadata (explicitly set in entry info)
   * metadata_rw: URIs of principals with read/write rights on metadata
   *   (explicitly set in entry info)
   * resource_r: URIs of principals with read rights on the resource (explicitly set in entry info)
   * resource_rw: URIs of principals with read/write rights on the resource
   *   (explicitly set in entry info)
   *
   * In addition there are a few methods that does not follow the general rule and have been
   * implemented separately and are therefore also documented separately. Those are for setting
   * a context, a limit, the sorting approach and how to restrict to a title with language.
   *
   * There is also a method ({@link store/Solr#getQuery getQuery}) for getting the query as a
   * string that is used by EntryStore API behind the scenes, you can safely ignore this method.
   *
   * @param {store/EntryStore} entrystore is an entrystore instance, needed if the list method is
   * used.
   * @namespace store/solr
   */
  const Solr = function (entrystore) {
    this._entrystore = entrystore;
    this.properties = [];
  };

  Solr.prototype.list = function (asyncCallType) {
    return new SearchList(this._entrystore, this, asyncCallType);
  };

  const methods = [
    'title',
    'description',
    'keyword',
    'tagLiteral',
    'tagURI',
    'lang',
    'all',
    'uri',
    'subject',
    'predicate',
    'objectLiteral',
    'objectUri',
    'resource',
    'rdfType',
    'context',
    'creator',
    'contributors',
    'lists',
    'public',
    'created',
    'modified',
    'entryType',
    'graphType',
    'resourceType',
    'admin',
    'metadata_r',
    'metadata_rw',
    'resource_r',
    'resource_rw',
    'status',
  ];

  const map = {
    entryType: 'entryType',
    graphType: 'graphType',
    resourceType: 'resourceType',
    tagLiteral: 'tag.literal',
    tagURI: 'tag.uri',
    subject: 'metadata.subject',
    predicate: 'metadata.predicate',
    objectLiteral: 'metadata.object.literal',
    objectUri: 'metadata.object.uri',
    admin: 'acl.admin',
    metadata_r: 'acl.metadata.r',
    metadata_rw: 'acl.metadata.rw',
    resource_r: 'acl.resource.r',
    resource_rw: 'acl.resource.rw',
  };

  array.map(methods, (method) => {
    Solr.prototype[method] = function (val, modifier) {
      this[`_${method}`] = val;
      if (typeof modifier !== 'undefined') {
        this[`_${method}_modifier`] = modifier;
      }
      return this;
    };
  });

  // ===========Overwrite some functions with better support for instances as well as strings.
  Solr.prototype.context = function (context) {
    if (context instanceof Context) {
      this._context = context.getResourceURI();
    } else if (context && context.getResourceURI) {
      this._context = context.getResourceURI();
    } else if (lang.isString(context) && context !== '') {
      this._context = context;
    } else {
      this._context = null;
    }
    return this;
  };

  Solr.prototype.rdfType = function (rdfType) {
    if (Array.isArray(rdfType)) {
      this._rdfType = array.map(rdfType, t => namespaces.expand(t));
    } else {
      this._rdfType = namespaces.expand(rdfType);
    }
    return this;
  };

  /**
   * If a title has a language set, a dynamic field is created with the pattern "title.en",
   * without multi value support. This is used in the context of sorting.
   * @param title {String} the title to search for
   * @param language {String} the language of the title for instance "en".
   */
  Solr.prototype.title_lang = function (title, language) {
    this._title_lang = { value: title, language };
    return this;
  };

  Solr.prototype.limit = function (limit) {
    this._limit = limit;
    return this;
  };

  Solr.prototype.getLimit = function () {
    return this._limit;
  };

  /**
   * The parameter "sort" can be used for Solr-style sorting, e.g. "sort=title+asc,modified+desc".
   * The default sorting value is to sort after the score (relevancy) and the modification date.
   * All string and non-multi value fields can be used for sorting, this basically excludes title,
   * description and keywords,
   * but allows sorting after e.g. title.en.
   * If no sort is explicitly given the default sort string used is "score+asc".
   * @param sort {String} a list of fields together with '+asc' or '+desc', first field has the
   * highest priority when sorting.
   */
  Solr.prototype.sort = function (sort) {
    this._sort = sort;
    return this;
  };

  Solr.prototype.offset = function (offset) {
    this._offset = offset;
    return this;
  };

  Solr.prototype.getQuery = function (entryStore) {
    const and = [];
    let i;
    let j;
    if (this._title_lang != null) {
      and.push(`title.${this._title_lang.lang}:${encodeURIComponent(this._title_lang.value
        .replace(/:/g, '\\:'))}`);
    }
    for (i = 0; i < methods.length; i++) {
      const method = methods[i];
      const v = this[`_${method}`];
      if (v != null) {
        const key = map[method] || method;
        const modifier = this[`_${method}_modifier`];
        if (lang.isString(v) && v !== '') {
          if (modifier === true || modifier === 'not') {
            and.push(`NOT(${key}:${encodeURIComponent(v.replace(/:/g, '\\:'))})`);
          } else {
            and.push(`${key}:${encodeURIComponent(v.replace(/:/g, '\\:'))}`);
          }
        } else if (Array.isArray(v) && v.length > 0) {
          const or = [];
          for (j = 0; j < v.length; j++) {
            const ov = v[j];
            if (lang.isString(ov)) {
              or.push(`${key}:${encodeURIComponent(ov.replace(/:/g, '\\:'))}`);
            }
          }
          if (modifier === true || modifier === 'not') {
            and.push(`NOT(${or.join('+OR+')})`);
          } else if (modifier === 'and') {
            and.push(`(${or.join('+AND+')})`);
          } else {
            and.push(`(${or.join('+OR+')})`);
          }
        }
      }
    }

    if (this.disjunctiveProperties) {
      const or = [];
      array.forEach(this.properties, (prop) => {
        const obj = prop.object;
        const key = `metadata.predicate.${prop.nodetype}.${prop.md5}`;
        if (lang.isString(obj)) {
          or.push(`${key}:${encodeURIComponent(obj.replace(/:/g, '\\:'))}`);
        } else if (Array.isArray(obj) && obj.length > 0) {
          array.forEach(obj, (o) => {
            or.push(`${key}:${encodeURIComponent(o.replace(/:/g, '\\:'))}`);
          });
        }
      });
      if (or.length > 0) {
        and.push(`(${or.join('+OR+')})`);
      }
    } else {
      this.properties.forEach((prop) => {
        const obj = prop.object;
        const key = `metadata.predicate.${prop.nodetype}.${prop.md5}`;
        if (lang.isString(obj)) {
          if (prop.modifier === true || prop.modifier === 'not') {
            and.push(`NOT(${key}:${encodeURIComponent(obj.replace(/:/g, '\\:'))})`);
          } else {
            and.push(`${key}:${encodeURIComponent(obj.replace(/:/g, '\\:'))}`);
          }
        } else if (Array.isArray(obj) && obj.length > 0) {
          const or = [];
          array.forEach(obj, (o) => {
            or.push(`${key}:${encodeURIComponent(o.replace(/:/g, '\\:'))}`);
          }, this);
          if (prop.modifier === true || prop.modifier === 'not') {
            and.push(`NOT(${or.join('+OR+')})`);
          } else if (prop.modifier === 'and') {
            and.push(`(${or.join('+AND+')})`);
          } else {
            and.push(`(${or.join('+OR+')})`);
          }
        }
      }, this);
    }

    let trail = '';
    if (this._limit != null) {
      trail = `&limit=${this._limit}`;
    }
    if (this._offset) {
      trail = `${trail}&offset=${this._offset}`;
    }
    if (this._sort) {
      trail = `${trail}&sort=${this._sort || 'score+asc'}`;
    }
    if (this.facets) {
      trail += `&facetFields=${this.facets.join(',')}`;
    }
    return `${entryStore.getBaseURI()}search?type=solr&query=${and.join('+AND+')}${trail}`;
  };

  const shorten = function (predicate) {
    return md5(namespaces.expand(predicate)).substr(0, 8);
  };
  Solr.prototype.shorten = shorten;

  Solr.prototype.integerProperty = function (predicate, object, modifier) {
    const key = shorten(predicate);
    this.properties.push({
      md5: key,
      object,
      modifier,
      nodetype: 'integer',
    });
    return this;
  };

  Solr.prototype.literalProperty = function (predicate, object, modifier) {
    const key = shorten(predicate);
    this.properties.push({
      md5: key,
      object,
      modifier,
      nodetype: 'literal',
    });
    return this;
  };

  Solr.prototype.uriProperty = function (predicate, object, modifier) {
    const key = shorten(predicate);

    this.properties.push({
      md5: key,
      object: Array.isArray(object) ? object.map(o => namespaces.expand(o)) : namespaces.expand(object),
      modifier,
      nodetype: 'uri',
    });
    return this;
  };

  Solr.prototype.disjuntiveProperties = function () {
    this.disjunctiveProperties = true;
  };

  Solr.prototype.facet = function (facet, predicate) {
    this.facets = this.facets || [];
    if (predicate) {
      this.facet2predicate = this.facet2predicate || {};
      this.facet2predicate[facet] = namespaces.expand(predicate);
    }
    this.facets.push(facet);
    return this;
  };

  Solr.prototype.literalFacet = function (predicate) {
    this.facet(`metadata.predicate.literal_s.${shorten(predicate)}`, predicate);
    return this;
  };

  Solr.prototype.uriFacet = function (predicate) {
    this.facet(`metadata.predicate.uri.${shorten(predicate)}`, predicate);
    return this;
  };

  Solr.prototype.integerFacet = function (predicate) {
    this.facet(`metadata.predicate.integer.${shorten(predicate)}`, predicate);
    return this;
  };

  /** We want to avoid writing new solr.title("...").type("...") and instead write:
   * solr.title("...").type("...")
   *
   * To achieve this we need to fiddle with the return value (solr).
   * Rather than returning the class solr we return a object where all methods from the class are
   * available as wrapped methods. Each wrapped method creates an instance and then invokes the
   * same method on that class instance. For example:
   * solr.wrappedMethodCall(...).originalMethodCall1().originalMethodCall2() and so on.
   */
  const solr = { Solr };
  const transferMethods = methods.concat(['limit', 'getLimit', 'offset', 'sort', 'context', 'title_lang', 'literalProperty', 'uriProperty', 'shorten', 'facet', 'uriFacet', 'literalFacet', 'integerFacet']);
  array.map(transferMethods, (method) => {
    solr[method] = function (val, not) {
      const solrInstance = new Solr();
      return solrInstance[method].call(solrInstance, val, not);
    };
  });
  return solr;

  // http://localhost:8080/scam/search?type=solr&query=rdfType:http%5C%3A%2F%2Fdbpedia.org%2Fontology%2FBuilding&sort=score+asc&limit=100
});
