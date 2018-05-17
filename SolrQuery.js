const namespaces = require('rdfjson/namespaces');
import { SearchList } from './SearchList';
import { Context } from './Context';
import { EntryStore } from 'EntryStore';
import { md5 } from 'blueimp-md5';

  const encodeStr = str => encodeURIComponent(str.replace(/:/g, '\\:'));
  const shorten = predicate => md5(namespaces.expand(predicate)).substr(0, 8);
  const ngramLimit = 15;
  const isNgram = key => key.indexOf('title') === 0
    || key.indexOf('tag.literal') === 0
    || (key.indexOf('metadata.predicate.literal') === 0 &&
      key.indexOf('metadata.predicate.literal_s') !== 0);
  /**
   * Empty spaces in search term should be interpreted as AND instead of the default OR.
   * In addition, fields indexed as text_ngram will have to be shortened to the ngram max limit
   * as they will not match otherwise.
   *
   * @param key
   * @param term
   * @return {*}
   */
  const solrFriendly = (key, term) => {
    let and = term.trim().replace(/\s\s+/g, ' ').split(' ');
    if (isNgram(key)) {
      and = and.map(t => (t.length < ngramLimit ? encodeStr(t) :
        encodeStr(t.substr(0, ngramLimit))));
    }
    return and.length === 1 ? encodeStr(and[0]) : `(${and.join('+AND+')})`;
  };
  const buildQuery = (struct, isAnd) => {
    const terms = [];
    Object.keys(struct).forEach((key) => {
      let val = struct[key];
      val = Array.isArray(val) ? val.map(v => namespaces.expand(v)) : namespaces.expand(val);
      switch (key) {
        case 'or':
          terms.push(buildQuery(val, false));
          break;
        case 'and':
          terms.push(buildQuery(val, true));
          break;
        default:
          if (typeof val === 'string') {
            terms.push(`${key}:${solrFriendly(key, val)}`);
          } else if (Array.isArray(val)) {
            const or = [];
            val.forEach((o) => {
              or.push(`${key}:${solrFriendly(key, o)}`);
            });
            if (or.length > 1) {
              terms.push(`(${or.join('+OR+')})`);
            } else {
              terms.push(`${or.join('+OR+')}`);
            }
          } else if (typeof val === 'object') {
            // TODO
          }
      }
    });
    if (terms.length > 1) {
      return `(${terms.join(isAnd ? '+AND+' : '+OR+')})`;
    }
    return terms.join(`${isAnd ? '+AND+' : '+OR+'}`);
  };

  /**
   * The SolrQuery class provides a way to create a query by chaining method calls according to
   * the builder pattern. For example:
   *
   *     const sq = es.newSolrQuery().title("some title").type("http://example.com/Person")
   *
   * The example yields a search for entries that have a title that contains "some title"
   * and a rdf:type of "http://example.com/Person" expressed in the metadata.
   * To execute the query you can either ask for a {@link store/SearchList} and then call
   * getEntries (or forEach):
   *
   *     const sl = sq.list();
   *     sl.getEntries().then((entryArr) => {// Do something })
   *
   * Or you use the abbreviated version where you just call getEntries directly (or forEach)
   * on the SolrQuery:
   *
   *     sq.getEntries()
   *
   * The majority of the methods work the same way, that is they take two values, a value and a
   * possible negation flag. The value can be an array corresponding to a disjunction and if the
   * flag is set true the search string will be constructed to search for the negatation of the
   * provided value. For example, if a graph type in the form of an array containing List and User
   * is provided together with a negation boolean set to true, the query will search for anything
   * but lists and users:
   *
   *     sq.graphType([types.GT_LIST, types.GT_USER], true)
   *
   * Supported methods on the solr object correspond in large to the available solr fields
   * documentet at, some method names are different to avoid dots:
   * {@link https://code.google.com/p/entrystore/wiki/KnowledgeBaseSearch}
   *
   * There is also a special method ({@link store/SolrQuery#getQuery getQuery}) for getting the
   * query as a string that is used by EntryStore API behind the scenes, you can safely ignore
   * this method.
   *
   * @exports store/SolrQuery
   */
  const SolrQuery = class {
    /**
     * @param {store/EntryStore} entrystore
     */
    constructor(entrystore) {
      this._entrystore = entrystore;
      this.properties = [];
      this.params = {};
      this.modifiers = {};
      this._and = [];
      this._or = [];
    }

    /**
     * @private
     */
    _q(key, val, modifier) {
      this.params[key] = val;
      if (typeof modifier !== 'undefined') {
        this.modifiers[key] = modifier;
      }
      return this;
    }

    /**
     * Matches all titles in all languages, multivalued, cannot be sorted on.
     * Includes dc:title, dcterms:title, skos:prefLabel, skos:altLabel, skos:hiddenLabel,
     * rdfs:label, foaf:name.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    title(val, modifier) {
      return this._q('title', val, modifier);
    }
    /**
     * Matches all descriptions in all languages, multivalued, cannot be sorted on.
     * Includes dc:description, dcterms:description, rdfs:comment
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    description(val, modifier) {
      return this._q('description', val, modifier);
    }
    /**
     * Matches all tags literals in all languages, multivalued, cannot be sorted on.
     * Includes dc:subject, dcterms:subject, dcat:keyword and lom:keyword
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    tagLiteral(val, modifier) {
      return this._q('tag.literal', val, modifier);
    }
    /**
     * Matches all tag URIs, multivalued, cannot be sorted on.
     * Includes dc:subject, dcterms:subject
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    tagURI(val, modifier) {
      return this._q('tag.uri', val, modifier);
    }
    /**
     * Matches the language (as a literal) of the resource, single value, can be used for sorting?
     * Includes dc:language, dcterms:language
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    lang(val, modifier) {
      return this._q('lang', val, modifier);
    }
    /**
     * Matches title, description and tags, multivalue, cannot be sorted on.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    all(val, modifier) {
      return this._q('all', val, modifier);
    }
    /**
     * Matches all URIs in subject position in the metadata, except the resourceURI.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    subject(val, modifier) {
      return this._q('metadata.subject', val, modifier);
    }
    /**
     * Matches all URIs in predicate position in the metadata.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    predicate(val, modifier) {
      return this._q('metadata.predicate', val, modifier);
    }
    /**
     * Matches all literals in object position in the metadata.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    objectLiteral(val, modifier) {
      return this._q('metadata.object.literal', val, modifier);
    }
    /**
     * Matches all URIs in object position in the metadata.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    objectUri(val, modifier) {
      return this._q('metadata.object.uri', val, modifier);
    }
    /**
     * Matches the resourceURI of the entry.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    resource(val, modifier) {
      return this._q('resource', val, modifier);
    }
    /**
     * Matches the entryURI of the entry.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    uri(val, modifier) {
      return this._q('uri', val, modifier);
    }    /**
     * Matches all types of the resourceURI, i.e.
     * all URIs pointed to via rdf:type from the resourceURI.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    rdfType(rdfType, modifier) {
      if (Array.isArray(rdfType)) {
        return this._q('rdfType', array.map(rdfType, t => namespaces.expand(t)), modifier);
      }
      return this._q('rdfType', namespaces.expand(rdfType), modifier);
    }
    /**
     * Matches all creators (in the entry information graph) expressed via their resourceURIs.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    creator(val, modifier) {
      return this._q('creator', val, modifier);
    }
    /**
     * Matches all contributors (in the entry information graph) expressed via their resourceURIs.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    contributors(val, modifier) {
      return this._q('contributors', val, modifier);
    }
    /**
     * Matches only entries that are part of the given lists, identified via their resourceURIs.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    lists(val, modifier) {
      return this._q('lists', val, modifier);
    }
    /**
     * Matches entries that are created at the specific date, most useful for sorting.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    created(val, modifier) {
      return this._q('created', val, modifier);
    }
    /**
     * Matches entries that are modified at the specific date, most useful for sorting.
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    modified(val, modifier) {
      return this._q('modified', val, modifier);
    }
    /**
     * Matches entries with the given entry type, use the values in {@link store/types}, e.g.
     * sq.entryType(types.ET_LINK).
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    entryType(val, modifier) {
      return this._q('entryType', val, modifier);
    }
    /**
     * Matches entries with the given graph type, use the values in {@link store/types}, e.g.
     * sq.entryType(types.GT_USER).
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    graphType(val, modifier) {
      return this._q('graphType', val, modifier);
    }
    /**
     * Matches entries with the given resource type, use the values in {@link store/types}, e.g.
     * sq.entryType(types.RT_INFORMATIONRESOURCE).
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    resourceType(val, modifier) {
      return this._q('resourceType', val, modifier);
    }
    /**
     * Matches only public entries. Warning, individual entrys public flag is inherited from
     * surrounding context and if the context ACL is updated the entrys are not reindexed
     * automatically. Hence, this flag may be incorrect.
     *
     * @param {true|false} isPublic
     * @return {store/SolrQuery}
     */
    publicRead(isPublic = true) {
      return this._q('public', isPublic === true ? 'true' : 'false', modifier);
    }
    /**
     * Matches only entries with explicitly ACL stating user(s) has admin rights
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    admin(val, modifier) {
      return this._q('acl.admin', val, modifier);
    }
    /**
     * Matches only entries with explicitly ACL stating user(s) has metadata read rights
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    metadataRead(val, modifier) {
      return this._q('acl.metadata.r', val, modifier);
    }
    /**
     * Matches only entries with explicitly ACL stating user(s) has metadata write (and read) rights
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    metadataWrite(val, modifier) {
      return this._q('acl.metadata.rw', val, modifier);
    }
    /**
     * Matches only entries with explicitly ACL stating user(s) has resource read rights
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    resourceRead(val, modifier) {
      return this._q('acl.resource.r', val, modifier);
    }
    /**
     * Matches only entries with explicitly ACL stating user(s) has resource write (and read) rights
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    resourceWrite(val, modifier) {
      return this._q('acl.resource.rw', val, modifier);
    }
    /**
     * Matches entries with with specific status (expressed in entry information graph)
     *
     * @param {string|array} val
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    status(val, modifier) {
      return this._q('status', val, modifier);
    }
    /**
     * Matches only entries within specified context(s)
     *
     * @param {string|store/Context} context either a store/Context instance or a string. If it
     * is a string and it starts with 'http' it is assumed it is the resourceURI of the context,
     * otherwise the context is assumed to be a contextId.
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    context(context, modifier = false) {
      if (context && context.getResourceURI) {
        return this._q('context', context.getResourceURI(), modifier);
      } else if (((typeof context) === 'string') && context !== '') {
        if (context.indexOf('http') === 0) {
          return this._q('context', context, modifier);
        }
        return this._q('context', this._entrystore.getContextById(context)
          .getResourceURI(), modifier);
      }
      return this;
    }

    /**
     * Provide a query in the form of an object structure where the toplevel attributes
     * are disjunctive (OR:ed together). The following example will query for things that
     * are typed as vedgetables AND have the word 'tomato' in either the title OR description:
     * query.rdfType('ex:Vedgetable).or({
     *   title: 'tomato',
     *   description: 'tomato'
     * });
     *
     * Note, the name of the method ('or') does not refers to how the object structure is
     * combined with the rest of the query, only how the inner parts of the object structure
     * is combined. To change the toplevel behaviour of the query from an and to an or,
     * use the disjunctive method.
     *
     * @param {object} struct
     * @return {store/SolrQuery}
     */
    or(struct) {
      this._or.push(struct);
      return this;
    }

    /**
     * Provide a query in the form of an object structure where the toplevel attributes
     * are conjunctive (AND:ed together). The following example will query for things that
     * are typed as vedgetables OR typed as fruit AND has a title that contains the word 'orange':
     * query.disjunctive().rdfType('ex:Vedgetable).and({
     *   rdfType: 'ex:Fruit',
     *   title: 'Orange',
     * });
     *
     * Note, the name of the method ('and') does not refers to how the object structure is
     * combined with the rest of the query, only how the inner parts of the object structure
     * is combined. In this example we have change the toplevel behaviour of the query to
     * become disjunctive (being OR:ed together), this is to make the query more representative
     * since there is no need for the grouping of the object structure otherwise.
     *
     * @param {object} struct
     * @return {store/SolrQuery}
     */
    and(struct) {
      this._and.push(struct);
      return this;
    }

    /**
     * @deprecated
     */
//eslint-disable-next-line
    title_lang(title, language) {
    }
    /**
     * If a title has a language set, a dynamic field is created with the pattern "title.en",
     * without multi value support. This is used in the context of sorting.
     * @param title {String} the title to search for
     * @param language {String} the language of the title for instance "en".
     * @return {store/SolrQuery}
     */
    titleWithLanguage(title, language) {
      this._title_lang = { value: title, language };
      return this;
    }
    /**
     * Matches specific property value combinations.
     *
     * @param {string} predicate
     * @param {string|array} object
     * @param {true|false|string} modifier
     * @param {text|string|ngram} indexType text is default and corresponds to matching words,
     * string corresponds to exact string matching and ngram corresponds to partial string matching
     * @return {store/SolrQuery}
     */
    literalProperty(predicate, object, modifier, indexType = 'text') {
      const key = shorten(predicate);
      let it;
      switch (indexType) {
        case 'ngram':
          it = 'litera_ng';
          break;
        case 'string':
          it = 'literal_s';
          break;
        case 'text':
        default:
          it = 'literal';
      }
      this.properties.push({
        md5: key,
        object,
        modifier,
        nodetype: it,
      });
      return this;
    }
    /**
     * Matches specific property value combinations when the value is an integer.
     * Note that the integer values are single value per property and can be used for sorting.
     *
     * @param {string} predicate
     * @param {string|array} object
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    integerProperty(predicate, object, modifier) {
      const key = shorten(predicate);
      this.properties.push({
        md5: key,
        object,
        modifier,
        nodetype: 'integer',
      });
      return this;
    }
    /**
     * Matches specific property value combinations when the value is an integer.
     * Note that the integer values are single value per property and can be used for sorting.
     *
     * @param {string} predicate
     * @param {string|array} object
     * @param {true|false|string} modifier
     * @return {store/SolrQuery}
     */
    uriProperty(predicate, object, modifier) {
      const key = shorten(predicate);

      this.properties.push({
        md5: key,
        object: Array.isArray(object) ? object.map(o => namespaces.expand(o)) :
          namespaces.expand(object),
        modifier,
        nodetype: 'uri',
      });
      return this;
    }
    /**
     * Sets the pagination limit.
     *
     * @param {string|integer} limit
     * @return {store/SolrQuery}
     */
    limit(limit) {
      this._limit = limit;
      return this;
    }
    /**
     * Gets the pagination limit if it set.
     *
     * @param {string|integer} limit
     * @return {store/SolrQuery}
     */
    getLimit() {
      return this._limit;
    }
    /**
     * The parameter "sort" can be used for Solr-style sorting, e.g. "sort=title+asc,modified+desc".
     * The default sorting value is to sort after the score (relevancy) and the modification date.
     * All string and non-multi value fields can be used for sorting, this basically excludes title,
     * description and keywords,
     * but allows sorting after e.g. title.en.
     * If no sort is explicitly given the default sort string used is "score+asc".
     * @param sort {String} a list of fields together with '+asc' or '+desc', first field has the
     * highest priority when sorting.
     * @return {store/SolrQuery}
     */
    sort(sort) {
      this._sort = sort;
      return this;
    }
    /**
     * Set an explicit offset.
     *
     * @param {string|integer} offset
     * @return {store/SolrQuery}
     */
    offset(offset) {
      this._offset = offset;
      return this;
    }

    /**
     * @private
     * @param {string} facet
     * @param {string} predicate
     * @return {store/SolrQuery}
     */
    facet(facet, predicate) {
      this.facets = this.facets || [];
      if (predicate) {
        this.facet2predicate = this.facet2predicate || {};
        this.facet2predicate[facet] = namespaces.expand(predicate);
      }
      this.facets.push(facet);
      return this;
    }
    /**
     * Request to include literal facets for the given predicate
     * @param {string} predicate
     * @return {store/SolrQuery}
     */
    literalFacet(predicate) {
      this.facet(`metadata.predicate.literal_s.${shorten(predicate)}`, predicate);
      return this;
    }
    /**
     * Request to include URI facets for the given predicate
     * @param {string} predicate
     * @return {store/SolrQuery}
     */
    uriFacet(predicate) {
      this.facet(`metadata.predicate.uri.${shorten(predicate)}`, predicate);
      return this;
    }
    /**
     * Request to include integer facets for the given predicate
     * @param {string} predicate
     * @return {store/SolrQuery}
     */
    integerFacet(predicate) {
      this.facet(`metadata.predicate.integer.${shorten(predicate)}`, predicate);
      return this;
    }
    /**
     * Tell the query construction to make the fields added via the property methods
     * (uriProperty, literalProperty and integerProperty) to be disjunctive rather than
     * conjunctive. For example:
     *
     *     es.newSolrQuery().disjuntiveProperties().literalProperty("dcterms:title", "banana")
     *          .uriProperty("dcterms:subject", "ex:Banana");
     *
     * Will search for entries that have either a "banana" in the title or a relation to
     * ex:Banana via dcterms:subject. The default, without disjunctiveProperties being called
     * is to create a conjunction, i.e. AND them together.
     *
     * @return {store/SolrQuery}
     */
    disjuntiveProperties() {
      this.disjunctiveProperties = true;
      return this;
    }
    /**
     * Tell the query construction to make top level fields disjunctive rather than
     * conjunctive. For example
     *
     *     es.newSolrQuery().disjuntive().title("banana").description("tomato")
     *
     * Will search for entries that have either a "banana" in the title or "tomato" in the
     * description rather than entries that have both which is the default.
     *
     * @return {store/SolrQuery}
     */
    disjuntive() {
      this.disjunctive = true;
      return this;
    }
    /**
     * Construct a SearchList fro this SolrQuery.
     *
     * @param asyncCallType
     * @returns {store/SearchList}
     */
    list(asyncCallType) {
      return new SearchList(this._entrystore, this, asyncCallType);
    }

    /**
     * Produces the actual query to the EntryStore API.
     * @return {string}
     * @protected
     */
    getQuery() {
      const and = [];
      if (this._title_lang != null) {
        and.push(`title.${this._title_lang.lang}:${solrFriendly(this._title_lang.lang,
          this._title_lang.value)}`);
      }
      Object.keys(this.params).forEach((key) => {
        const v = this.params[key];
        const modifier = this.modifiers[key];
        if ((typeof v === 'string') && v !== '') {
          if (modifier === true || modifier === 'not') {
            and.push(`NOT(${key}:${solrFriendly(key, v)})`);
          } else {
            and.push(`${key}:${solrFriendly(key, v)}`);
          }
        } else if (Array.isArray(v) && v.length > 0) {
          const or = [];
          v.forEach((ov) => {
            if ((typeof ov === 'string') ) {
              or.push(`${key}:${solrFriendly(key, ov)}`);
            }
          });
          if (modifier === true || modifier === 'not') {
            and.push(`NOT(${or.join('+OR+')})`);
          } else if (modifier === 'and') {
            and.push(`(${or.join('+AND+')})`);
          } else {
            and.push(`(${or.join('+OR+')})`);
          }
        }
      });

      if (this.disjunctiveProperties || this.disjunctive) {
        const or = [];
        array.forEach(this.properties, (prop) => {
          const obj = prop.object;
          const key = `metadata.predicate.${prop.nodetype}.${prop.md5}`;
          if (typeof obj === 'string') {
            or.push(`${key}:${solrFriendly(key, obj)}`);
          } else if (Array.isArray(obj) && obj.length > 0) {
            array.forEach(obj, (o) => {
              or.push(`${key}:${solrFriendly(key, o)}`);
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
          if (typeof obj === 'string') {
            if (prop.modifier === true || prop.modifier === 'not') {
              and.push(`NOT(${key}:${solrFriendly(key, obj)})`);
            } else {
              and.push(`${key}:${solrFriendly(key, obj)}`);
            }
          } else if (Array.isArray(obj) && obj.length > 0) {
            const or = [];
            array.forEach(obj, (o) => {
              or.push(`${key}:${solrFriendly(key, o)}`);
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
      this._and.forEach((struct) => {
        and.push(buildQuery(struct, true));
      });
      this._or.forEach((struct) => {
        and.push(buildQuery(struct, false));
      });

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
      return `${this._entrystore.getBaseURI()}search?type=solr&query=${and.join(this.disjunctive ? '+OR' : '+AND+')}${trail}`;
    }
    /**
     * @param page
     * @returns {entryArrayPromise} the promise will return an entry-array.
     * @see {store/List.getEntries}
     */
    getEntries(page) {
      return this.list().getEntries(page);
    }
    /**
     * @param func
     * @return {promise}
     * @see {store/List.forEach}
     */
    forEach(func) {
      return this.list().forEach(func);
    }
  };

  export { SolrQuery };
