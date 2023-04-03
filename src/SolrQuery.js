import md5 from 'blueimp-md5';
import { namespaces } from '@entryscape/rdfjson';
import SearchList from './SearchList';

const encodeStr = str => encodeURIComponent(str.replace(/:/g, '\\:')
  .replace(/\(/g, '\\(').replace(/\)/g, '\\)'));
const shorten = predicate => md5(namespaces.expand(predicate)).substr(0, 8);
const ngramMaxLimit = 15;
const ngramMinLimit = 3;
const isNgram = key => key.indexOf('title') === 0
  || key.indexOf('description') === 0
  || key.indexOf('tag.literal') === 0
  || (key.indexOf('metadata.predicate.literal') === 0 &&
    key.indexOf('metadata.predicate.literal_') !== 0)
  || (key.indexOf('related.metadata.predicate.literal') === 0 &&
    key.indexOf('related.metadata.predicate.literal_') !== 0);
const isExactMatch = key => key.indexOf('predicate.literal_s') > 0 || key.indexOf('predicate.literal') === -1;

const isDateKey = key => key === 'created' || key === 'modified' || key.indexOf('metadata.predicate.date') >= 0;
const isIntegerKey = key => key.indexOf('metadata.predicate.integer') >= 0;

const isText = key => key.indexOf('metadata.object.literal') >= 0
  || key.indexOf('metadata.predicate.literal_t') >= 0;
const textTokenize = str => str.split(/\W+/).filter(token => token.length > 2).map(encodeStr);

/**
 * Empty spaces in search term should be interpreted as AND instead of the default OR.
 * In addition, fields indexed as text_ngram will have to be shortened to the ngram max limit
 * as they will not match otherwise.
 *
 * @param key
 * @param term
 * @param isFacet
 * @return {*}
 */
const solrFriendly = (key, term, isFacet) => {
  let and = term.trim().replace(/\s\s+/g, ' ');
  let boost = '';
  if (and.indexOf('^') >= 0) {
    const andArr = and.split('^');
    and = andArr[0];
    boost = `^${andArr[1]}`;
  }
  if (isText(key) && isFacet !== true) {
    and = textTokenize(and);
  } else if (isNgram(key) && isFacet !== true) {
    and = and.split(' ').map(t => (t.length < ngramMaxLimit ? encodeStr(t)
      : encodeStr(t.substr(0, ngramMaxLimit))))
      .map(t => (t.length < ngramMinLimit && !t.endsWith('*') ? `${t}*` : t));
  } else if (isDateKey(key) || isIntegerKey(key)) {
    and = Array.isArray(and) ? and : [and];
    and = and.map(v => v.replace(/\s+/g, '%20'));
  } else if (isExactMatch(key)) {
    if (and.indexOf(' ') === -1) {
      and = [encodeStr(and)];
    } else {
      and = [`%22${encodeStr(and)}%22`];
    }
  } else {
    and = and.split(' ').map(t => encodeStr(t));
  }
  return and.length === 1 ? `${and[0]}${boost}` : `(${and.join(`${boost}+AND+`)}${boost})`;
};

const toDateRange = (from, to) => `[${from ? from.toISOString() : '*'} TO ${to ? to.toISOString() : '*'}]`;
const toIntegerRange = (from, to) => `[${from || '*'} TO ${to || '*'}]`;

/**
 *
 * @param struct
 * @param isAnd
 * @return {string}
 */
const buildQuery = (struct, isAnd) => {
  const terms = [];
  Object.keys(struct).forEach((key) => {
    let val = struct[key];
    const valueIsArray = Array.isArray(val);
    if (valueIsArray || typeof val === 'string') {
      val = valueIsArray ? val.map(v => namespaces.expand(v)) : namespaces.expand(val);
    }
    switch (key) {
      case 'not':
        terms.push(`NOT(${buildQuery(val, false)})`);
        break;
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
 *     const sq = es.newSolrQuery().title("some title").rdfType("http://example.com/Person")
 *
 * The example yields a search for entries that have a title that contains "some title"
 * and a rdf:type of "http://example.com/Person" expressed in the metadata.
 * To execute the query you can either ask for a {@link SearchList} and then call
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
 * flag is set true the search string will be constructed to search for the negation of the
 * provided value. For example, if a graph type in the form of an array containing List and User
 * is provided together with a negation boolean set to true, the query will search for anything
 * but lists and users:
 *
 *     sq.graphType([types.GT_LIST, types.GT_USER], true)
 *
 * Supported methods on the solr object correspond in large to the available solr fields
 * documented at, some method names are different to avoid dots:
 * {@link https://code.google.com/p/entrywiki/KnowledgeBaseSearch}
 *
 * There is also a special method ({@link SolrQuery#getQuery getQuery}) for getting the
 * query as a string that is used by EntryStore API behind the scenes, you can safely ignore
 * this method.
 *
 * @exports store/SolrQuery
 */
export default class SolrQuery {

  /**
   * @param {EntryStore} entrystore
   */
  constructor(entrystore) {
    this._entrystore = entrystore;
    this.properties = [];
    this.relatedProperties = [];
    /**
     *
     * @type {Map<string, *>}
     */
    this.params = new Map();
    /**
     *
     * @type {Map<string, any>}
     */
    this.modifiers = new Map();
    /**
     *
     * @type {Set<Object>}
     * @private
     */
    this._and = new Set();
    /**
     *
     * @type {Set<Object>}
     * @private
     */
    this._or = new Set();
    this.facetpredicates = {};
    this.relatedFacetpredicates = {};
  }

  /**
   *
   * @param key
   * @param val
   * @param modifier
   * @returns {SolrQuery}
   * @private
   */
  _q(key, val, modifier = null) {
    this.params.set(key, val);
    if (modifier !== null) {
      this.modifiers.set(key, modifier);
    }
    return this;
  }

  /**
   * Matches the profile.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  profile(val, modifier = null) {
    return this._q('profile', val, modifier);
  }

  /**
   * Matches all titles in all languages, multivalued, cannot be sorted on.
   * Includes dc:title, dcterms:title, skos:prefLabel, skos:altLabel, skos:hiddenLabel,
   * rdfs:label, foaf:name.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  title(val, modifier = null) {
    return this._q('title', val, modifier);
  }

  /**
   * Matches all descriptions in all languages, multivalued, cannot be sorted on.
   * Includes dc:description, dcterms:description, rdfs:comment
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  description(val, modifier = null) {
    return this._q('description', val, modifier);
  }

  /**
   * Matches the username.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  username(val, modifier = null) {
    return this._q('username', val, modifier);
  }

  /**
   * Matches all tags literals in all languages, multivalued, cannot be sorted on.
   * Includes dc:subject, dcterms:subject, dcat:keyword and lom:keyword
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  tagLiteral(val, modifier = null) {
    return this._q('tag.literal', val, modifier);
  }

  /**
   * Matches all tag URIs, multivalued, cannot be sorted on.
   * Includes dc:subject, dcterms:subject
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  tagURI(val, modifier = null) {
    return this._q('tag.uri', val, modifier);
  }

  /**
   * Matches the language (as a literal) of the resource, single value, can be used for sorting?
   * Includes dc:language, dcterms:language
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  lang(val, modifier = null) {
    return this._q('lang', val, modifier);
  }

  /**
   * Matches title, description and tags, multivalue, cannot be sorted on.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  all(val, modifier = null) {
    return this._q('all', val, modifier);
  }

  /**
   * Matches all URIs in subject position in the metadata, except the resourceURI.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  subject(val, modifier = null) {
    return this._q('metadata.subject', val, modifier);
  }

  /**
   * Matches all URIs in predicate position in the metadata.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  predicate(val, modifier = null) {
    return this._q('metadata.predicate', val, modifier);
  }

  /**
   * Matches all literals in object position in the metadata.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  objectLiteral(val, modifier = null) {
    return this._q('metadata.object.literal', val, modifier);
  }

  /**
   * Matches all URIs in object position in the metadata.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  objectUri(val, modifier = null) {
    return this._q('metadata.object.uri', val, modifier);
  }

  /**
   * Matches the resourceURI of the entry.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  resource(val, modifier = null) {
    return this._q('resource', val, modifier);
  }

  /**
   * Matches the entryURI of the entry.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  uri(val, modifier = null) {
    return this._q('uri', val, modifier);
  }

  /**
   * Matches all types of the resourceURI, i.e.
   * all URIs pointed to via rdf:type from the resourceURI.
   *
   * @param {string|array} rdfType
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  rdfType(rdfType, modifier = null) {
    if (Array.isArray(rdfType)) {
      return this._q('rdfType', rdfType.map(t => namespaces.expand(t)), modifier);
    }
    return this._q('rdfType', namespaces.expand(rdfType), modifier);
  }

  /**
   * Matches all creators (in the entry information graph) expressed via their resourceURIs.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  creator(val, modifier = null) {
    return this._q('creator', val, modifier);
  }

  /**
   * Matches all contributors (in the entry information graph) expressed via their resourceURIs.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  contributors(val, modifier = null) {
    return this._q('contributors', val, modifier);
  }

  /**
   * Matches only entries that are part of the given lists, identified via their resourceURIs.
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  lists(val, modifier = null) {
    return this._q('lists', val, modifier);
  }

  /**
   * Matches entries that are created at a specific date or in a range.
   * Ranges must be given as strings as [2010-01-01T00:00:00Z TO *].
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  created(val, modifier = null) {
    return this._q('created', val, modifier);
  }

  /**
   * Utility function to create a range expression for the created function.
   *
   * @param {Date} from - no lower range restriction if undefined or null is passed
   * @param {Date} to - no upper range restriction if undefined or null is passed
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  createdRange(from, to, modifier = null) {
    return this._q('created', toDateRange(from, to), modifier);
  }

  /**
   * Matches entries that are modified at a specific date or in a range.
   * Ranges are given as strings as [2010-01-01T00:00:00Z TO *].
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  modified(val, modifier = null) {
    return this._q('modified', val, modifier);
  }

  /**
   * Utility function to create a range expression for the modified function.

   *
   * @param {Date} from - no lower range restriction if undefined or null is passed
   * @param {Date} to - no upper range restriction if undefined or null is passed
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  modifiedRange(from, to, modifier = null) {
    return this._q('modified', toDateRange(from, to), modifier);
  }

  /**
   * Matches entries with the given entry type, use the values in {@link types}, e.g.
   * sq.entryType(types.ET_LINK).
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  entryType(val, modifier = null) {
    return this._q('entryType', val, modifier);
  }

  /**
   * Matches entries with the given graph type, use the values in {@link types}, e.g.
   * sq.entryType(types.GT_USER).
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  graphType(val, modifier = null) {
    return this._q('graphType', val, modifier);
  }

  /**
   * Matches entries with the given resource type, use the values in {@link types}, e.g.
   * sq.entryType(types.RT_INFORMATIONRESOURCE).
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  resourceType(val, modifier = null) {
    return this._q('resourceType', val, modifier);
  }

  /**
   * Matches only public entries. Warning, individual entrys public flag is inherited from
   * surrounding context and if the context ACL is updated the entrys are not reindexed
   * automatically. Hence, this flag may be incorrect.
   *
   * @param {true|false} isPublic
   * @return {SolrQuery}
   */
  publicRead(isPublic = true) {
    return this._q('public', isPublic === true ? 'true' : 'false');
  }

  /**
   * Matches only entries with explicitly ACL stating user(s) has admin rights
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  admin(val, modifier = null) {
    return this._q('acl.admin', val, modifier);
  }

  /**
   * Matches only entries with explicitly ACL stating user(s) has metadata read rights
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  metadataRead(val, modifier = null) {
    return this._q('acl.metadata.r', val, modifier);
  }

  /**
   * Matches only entries with explicitly ACL stating user(s) has metadata write (and read) rights
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  metadataWrite(val, modifier = null) {
    return this._q('acl.metadata.rw', val, modifier);
  }

  /**
   * Matches only entries with explicitly ACL stating user(s) has resource read rights
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  resourceRead(val, modifier = null) {
    return this._q('acl.resource.r', val, modifier);
  }

  /**
   * Matches only entries with explicitly ACL stating user(s) has resource write (and read) rights
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  resourceWrite(val, modifier = null) {
    return this._q('acl.resource.rw', val, modifier);
  }

  /**
   * Matches entries with with specific status (expressed in entry information graph)
   *
   * @param {string|array} val
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  status(val, modifier = null) {
    return this._q('status', val, modifier);
  }

  /**
   * Matches only entries within specified context(s)
   *
   * @param {string|Context} context either a contextId, the resourceURI for a
   +     * context, a Context instance or an array containing any of those. In case of a
   +     * string, either directly or within the array and it starts with 'http' it is assumed it is
   +     * the resourceURI of the context, otherwise the context is assumed to be a contextId.
   * @param {true|false|string} modifier
   * @return {SolrQuery}
   */
  context(context, modifier = null) {
    const f = (c) => {
      if (c && c.getResourceURI) {
        return c.getResourceURI();
      } else if (typeof c === 'string' && c !== '') {
        if (c.indexOf('http') === 0) {
          return c;
        }
        return this._entrystore.getContextById(c).getResourceURI();
      }
      return null;
    };

    if (Array.isArray(context)) {
      const resourceURIArr = context.map(f).filter(v => v !== null);
      if (resourceURIArr.length > 0) {
        this._q('context', resourceURIArr, modifier);
      }
    } else {
      const resourceURI = f(context);
      if (resourceURI !== null) {
        return this._q('context', resourceURI, modifier);
      }
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
   * @param {Object} structure
   * @return {SolrQuery}
   */
  or(structure) {
    this._or.add(structure);
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
   * @param {Object} structure
   * @return {SolrQuery}
   */
  and(structure) {
    this._and.add(structure);
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
   * @return {SolrQuery}
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
   * @param {text|string} [indexType=ngram] 'ngram' corresponds to partial string
   * matching, string corresponds to exact string matching and text corresponds to word matching.
   * @param {boolean} [related=false] will search in related properties if true, default is false
   * @return {SolrQuery}
   */
  literalProperty(predicate, object, modifier, indexType = 'ngram', related = false) {
    const key = shorten(predicate);
    let nodetype;
    switch (indexType) {
      case 'text':
        nodetype = 'literal_t';
        break;
      case 'string':
        nodetype = 'literal_s';
        break;
      case 'ngram':
      default:
        nodetype = 'literal';
    }
    (related ? this.relatedProperties : this.properties).push({
      md5: key,
      pred: predicate,
      object,
      modifier,
      nodetype,
    });
    return this;
  }

  /**
   * Matches specific property value combinations when the value is an integer.
   * Note that the integer values are single value per property and can be used for sorting.
   * Ranges are allowed as strings, for instance [0 TO 100] or [0 TO *] for all positive integers.
   *
   * @param {string} predicate
   * @param {string|array} object
   * @param {true|false|string} modifier
   * @param {boolean} related - will search in related properties if true, default is false
   * @return {SolrQuery}
   */
  integerProperty(predicate, object, modifier, related = false) {
    const key = shorten(predicate);
    (related ? this.relatedProperties : this.properties).push({
      md5: key,
      pred: predicate,
      object,
      modifier,
      nodetype: 'integer',
    });
    return this;
  }

  /**
   * Utility function for creating a integer range for integerProperty.
   *
   * @param {string} predicate
   * @param {string|number} from - if undefined no lower bound will be created, corresponds to *
   * @param {string|number} to - if undefined no upper bound will be created, corresponds to *
   * @param {boolean} related - will search in related properties if true, default is false
   * @return {SolrQuery}
   */
  integerPropertyRange(predicate, from, to, modifier, related = false) {
    return this.integerProperty(predicate, toIntegerRange(from, to), modifier, related);
  }

  /**
   * Matches specific property value combinations when the value is an integer.
   * Note that the integer values are single value per property and can be used for sorting.
   * Ranges are allowed as strings, for instance [* TO 2010-01-01T00:00:00Z].
   *
   * @param {string} predicate
   * @param {string|array} object
   * @param {true|false|string} modifier
   * @param {boolean} related - will search in related properties if true, default is false
   * @return {SolrQuery}
   */
  dateProperty(predicate, object, modifier, related = false) {
    const key = shorten(predicate);
    (related ? this.relatedProperties : this.properties).push({
      md5: key,
      pred: predicate,
      object,
      modifier,
      nodetype: 'date',
    });
    return this;
  }

  /**
   * Utility function for creating a date range for dateProperty.
   *
   * @param {string} predicate
   * @param {Date} from
   * @param {Date} to
   * @param {true|false|string} modifier
   * @param {boolean} related - will search in related properties if true, default is false
   * @return {SolrQuery}
   */
  datePropertyRange(predicate, from, to, modifier, related = false) {
    return this.dateProperty(predicate, toDateRange(from, to), modifier, related);
  }

  /**
   * Matches specific property value combinations when the value is an uri.
   *
   * @param {string} predicate
   * @param {string|array} object
   * @param {true|false|string} modifier
   * @param {boolean} related - will search in related properties if true, default is false
   * @return {SolrQuery}
   */
  uriProperty(predicate, object, modifier, related = false) {
    const key = shorten(predicate);

    (related ? this.relatedProperties : this.properties).push({
      md5: key,
      pred: predicate,
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
   * @param {string|number} limit
   * @return {SolrQuery}
   */
  limit(limit) {
    this._limit = limit;
    return this;
  }

  /**
   * Gets the pagination limit if it set.
   *
   * @return {string|number}
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
   * @return {SolrQuery}
   */
  sort(sort) {
    this._sort = sort;
    return this;
  }

  /**
   * Set an explicit offset.
   *
   * @param {string|number} offset
   * @return {SolrQuery}
   */
  offset(offset) {
    this._offset = offset;
    return this;
  }

  /**
   * @private
   * @param {string} facet
   * @param {string} predicate
   * @param {boolean} [related=false]
   * @return {SolrQuery}
   */
  facet(facet, predicate, related = false) {
    this.facets = this.facets || [];
    if (predicate) {
      this.facet2predicate = this.facet2predicate || {};
      this.facet2predicate[facet] = namespaces.expand(predicate);
      if (related) {
        this.relatedFacetpredicates[predicate] = true;
      } else {
        this.facetpredicates[predicate] = true;
      }
    }
    this.facets.push(facet);
    return this;
  }

  /**
   * Request to include literal facets for the given predicate
   * @param {string} predicate
   * @param {boolean} [related=false] whether the facet is on the related predicates, default is false
   * @return {SolrQuery}
   */
  literalFacet(predicate, related = false) {
    this.facet(`${related ? 'related.' : ''}metadata.predicate.literal_s.${shorten(predicate)}`, predicate, related);
    return this;
  }

  /**
   * Request to include URI facets for the given predicate
   * @param {string} predicate
   * @param {boolean} [related=false] whether the facet is on the related predicates, default is false
   * @return {SolrQuery}
   */
  uriFacet(predicate, related = false) {
    this.facet(`${related ? 'related.' : ''}metadata.predicate.uri.${shorten(predicate)}`, predicate, related);
    return this;
  }

  /**
   * Request to include integer facets for the given predicate
   * @param {string} predicate
   * @param {boolean} [related=false] whether the facet is on the related predicates, default is false
   * @return {SolrQuery}
   */
  integerFacet(predicate, related = false) {
    this.facet(`${related ? 'related.' : ''}metadata.predicate.integer.${shorten(predicate)}`, predicate, related);
    return this;
  }

  /**
   * Tell the query construction to make the fields added via the property methods
   * (uriProperty, literalProperty and integerProperty) to be disjunctive rather than
   * conjunctive. For example:
   *
   *     es.newSolrQuery().disjunctiveProperties().literalProperty("dcterms:title", "banana")
   *          .uriProperty("dcterms:subject", "ex:Banana");
   *
   * Will search for entries that have either a "banana" in the title or a relation to
   * ex:Banana via dcterms:subject. The default, without disjunctiveProperties being called
   * is to create a conjunction, i.e. AND them together.
   *
   * @return {SolrQuery}
   */
  disjunctiveProperties() {
    this._disjunctiveProperties = true;
    return this;
  }

  /**
   * Tell the query construction to make top level fields disjunctive rather than
   * conjunctive. For example
   *
   *     es.newSolrQuery().disjunctive().title("banana").description("tomato")
   *
   * Will search for entries that have either a "banana" in the title or "tomato" in the
   * description rather than entries that have both which is the default.
   *
   * @return {SolrQuery}
   */
  disjunctive() {
    this._disjunctive = true;
    return this;
  }

  /**
   * Construct a SearchList fro this SolrQuery.
   *
   * @param asyncCallType
   * @returns {SearchList}
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

    this.params.forEach((v, key) => {
      const modifier = this.modifiers.get(key);
      if ((typeof v === 'string') && v !== '') {
        if (modifier === true || modifier === 'not') {
          and.push(`NOT(${key}:${solrFriendly(key, v)})`);
        } else {
          and.push(`${key}:${solrFriendly(key, v)}`);
        }
      } else if (Array.isArray(v) && v.length > 0) {
        const or = [];
        v.forEach((ov) => {
          if ((typeof ov === 'string')) {
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

    if (this.relatedProperties.length > 0) {
      const or = [];
      this.relatedProperties.forEach((prop) => {
        const obj = prop.object;
        const key = `related.metadata.predicate.${prop.nodetype}.${prop.md5}`;
        if (typeof obj === 'string') {
          or.push(`${key}:${solrFriendly(key, obj, this.relatedFacetpredicates[prop.pred])}`);
        } else if (Array.isArray(obj) && obj.length > 0) {
          obj.forEach((o) => {
            or.push(`${key}:${solrFriendly(key, o, this.relatedFacetpredicates[prop.pred])}`);
          });
        }
      });
      and.push(`(${or.join('+OR+')})`);
    }
    if (this._disjunctiveProperties || this._disjunctive) {
      const or = [];
      this.properties.forEach((prop) => {
        const obj = prop.object;
        const key = `metadata.predicate.${prop.nodetype}.${prop.md5}`;
        if (typeof obj === 'string') {
          or.push(`${key}:${solrFriendly(key, obj, this.facetpredicates[prop.pred])}`);
        } else if (Array.isArray(obj) && obj.length > 0) {
          obj.forEach((o) => {
            or.push(`${key}:${solrFriendly(key, o, this.facetpredicates[prop.pred])}`);
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
            and.push(`NOT(${key}:${solrFriendly(key, obj, this.facetpredicates[prop.pred])})`);
          } else {
            and.push(`${key}:${solrFriendly(key, obj, this.facetpredicates[prop.pred])}`);
          }
        } else if (Array.isArray(obj) && obj.length > 0) {
          const or = [];
          obj.forEach((o) => {
            or.push(`${key}:${solrFriendly(key, o, this.facetpredicates[prop.pred])}`);
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
    return `${this._entrystore.getBaseURI()}search?type=solr&query=${and.join(this._disjunctive ? '+OR' : '+AND+')}${trail}`;
  }

  /**
   * @param page
   * @returns {Promise.<Array.<Entry>>} the promise will return an entry-array.
   * @see {List.getEntries}
   */
  getEntries(page) {
    return this.list().getEntries(page);
  }

  /**
   * @param func
   * @return {promise}
   * @see {List.forEach}
   */
  forEach(func) {
    return this.list().forEach(func);
  }


}
