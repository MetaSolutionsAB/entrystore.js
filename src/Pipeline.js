import GraphResource from './Graph';
import terms from './terms';

/**
 * Pipeline is a Graph that contains an ordered list of transforms, each transform is of a
 * specific type and takes a set of arguments.
 *
 * @exports store/Pipeline
 */
export default class Pipeline extends GraphResource {
  /**
   * @param {string} entryURI - URI to an entry where this resource is contained.
   * @param {string} resourceURI - URI to the resource.
   * @param {EntryStore} entryStore - the API's repository instance.
   * @param {rdfjson/Graph | Object} data - is an RDF graph of some sort
   */
  constructor(entryURI, resourceURI, entryStore, data) {
    super(entryURI, resourceURI, entryStore, data); // Call the super constructor.
  }
  /**
   * The destination where the result (in the form of a single RDF graph) should
   * end up (within the specified entry's graph resource).
   * If empty string, a new entry will be created to store the results.
   * If undefined, the result will not go to a single destination, see getDetectDestination
   * instead. Some transform types does not respect the destination, e.g. currently ROWSTORE
   * which always creates a new entry containing the results.
   *
   * @returns {String|undefined} an entry URI where the result should go, empty string for new
   * entries for every execution or undefined if no destination has been specified.
   */
  getDestination() {
    return this._graph.findFirstValue(null, terms.pipeline.transformDestination);
  }

  /**
   * @see Pipeline#getDestination
   * @param {String} entryOrEntryURI entry URI, empty string for new entries every time,
   * use undefined to remove destination setting altogether.
   */
  setDestination(entryOrEntryURI) {
    this._graph.findAndRemove(null, terms.pipeline.transformDestination);
    const uri = typeof entryOrEntryURI === 'object' && entryOrEntryURI.getURI ?
      entryOrEntryURI.getURI() : entryOrEntryURI;
    this._graph.add(this._resourceURI, terms.pipeline.transformDestination, uri);
  }

  /**
   * Detect destination means that the result of the last transform (a graph) should be attempted
   * to be split into multiple entries according to markings in the graph.
   *
   * I.e. it detects and adds a set of entries from the graph via the anonymous closure
   * algorithm starting from blank nodes resources
   * with either one of the two following properties that both indicate which entryId to use:<ul>
   * <li>http://entrystore.org/terms/mergeResourceId or the</li>
   * <li>http://entrystore.org/terms/referenceResourceId</li>
   * </ul>
   * The mergeResourceId indicates that the corresponding entry should be merged or created if it
   * does not exist.
   * The referenceResourceId only indicates that another entry (via its resource id) should be
   * referenced from
   * the graph (which might be inside an entry indicated by mergeResourceId).
   *
   *
   * @returns {boolean} true if destination should be detected.
   */
  getDetectDestination() {
    const val = this._graph.findFirstValue(null, terms.pipeline.transformDetectDestination);
    if (typeof val !== 'undefined') {
      return val.toLowerCase().indexOf('true') === 0;
    }
    return false;
  }

  /**
   *
   * @see Pipeline#getDetectDestination
   * @param {boolean} detect if true detection of entry references in the graph is attempted.
   */
  setDetectDestination(detect) {
    this._graph.findAndRemove(null, terms.pipeline.transformDetectDestination);
    if (detect === true) {
      this._graph.add(this._resourceURI, terms.pipeline.transformDetectDestination, {
        type: 'literal', value: 'true', datatype: terms.xsd.boolean,
      });
    }
  }

  /**
   * @returns {String[]} of transform ids, typically blank node ids, hence, they are not
   * preserved between saves / loads so take care.
   */
  getTransforms() {
    const stmts = this._graph.find(null, terms.pipeline.transform);
    const arr = stmts.map(stmt => stmt.getValue());
    const self = this;
    arr.sort((tr1, tr2) => {
      const pr1 = self.getPriority(tr1);
      const pr2 = self.getPriority(tr2);
      return pr1 - pr2;
    });
    return arr;
  }

  /**
   * Finds a transform with the given type and returns its id.
   *
   * @param transformType the transform type to look for
   * @returns {string|undefined} transform id, undefined if no transform was found for the given type
   */
  getTransformForType(transformType) {
    let transformId;
    const trIds = this.getTransforms();
    trIds.forEach((trId) => {
      // get transform type and check for fetch and get url
      if (this.getTransformType(trId) === transformType) {
        transformId = trId;
      }
    }, this);

    return transformId;
  }

  /**
   * Adds a new transform.
   *
   * @param {String} type one of the [getTransforms]{@link Pipeline#getTransforms}.
   * @param {Object} args a hash of key value pairs for this transform.
   * @returns {String} the newly transforms id (for this session, may change after save / load
   * so take care).
   */
  addTransform(type, args) {
    const transforms = this.getTransforms();
    const priority = transforms.length > 0 ?
      this.getPriority(transforms[transforms.length - 1]) : 0;
    const stmt = this._graph.add(this._resourceURI, terms.pipeline.transform);
    const id = stmt.getValue();
    this.setTransformType(id, type);
    this.setPriority(id, priority + 1);
    this.setTransformArguments(id, args);

    return id;
  }

  /**
   * Removes a transform.
   *
   * @param {String} transformId the blank node of a specific transform as retrieved by
   * [getTransforms]{@link Pipeline#getTransforms}.
   * @see Pipeline#getTransforms
   */
  removeTransform(transformId) {
    this.setTransformArguments(transformId, {});
    this._graph.findAndRemove(transformId);
    this._graph.findAndRemove(null, null, { type: 'bnode', value: transformId });
  }

  /**
   * Changes the order of the transforms by changing their priority properties.
   *
   * @param {Array} transforms
   * [getTransforms]{@link Pipeline#getTransforms}.
   * @see Pipeline#getTransforms
   */
  setOrderOfTransforms(transforms) {
    for (let i = 0; i < transforms.length; i++) {
      this._graph.findAndRemove(transforms[i], terms.pipeline.transformPriority);
      this._graph.add(transforms[i], terms.pipeline.transformPriority, {
        type: 'literal', value: `${i}`, datatype: terms.xsd.integer,
      });
    }
  }

  /**
   * @param {String} transformId the blank node of a specific transform as retrieved by
   * [getTransforms]{@link Pipeline#getTransforms}.
   * @returns {number} the priority as a float.
   */
  getPriority(transformId) {
    let prio = this._graph.findFirstValue(transformId, terms.pipeline.transformPriority);
    if (typeof prio === 'string') {
      prio = parseFloat(prio);
      if (!isNaN(prio)) {
        return prio;
      }
    }
    return 0;
  }

  /**
   * It is recommended to use setOrderOfTransforms instead.
   * @param {String} transformId the blank node of a specific transform as retrieved by
   * [getTransforms]{@link Pipeline#getTransforms}.
   * @param {number} prio the priority as a float.
   * @see Pipeline#setOrderOfTransforms
   */
  setPriority(transformId, prio) {
    this._graph.findAndRemove(transformId, terms.pipeline.transformPriority);
    this._graph.add(transformId, terms.pipeline.transformPriority, {
      type: 'literal', value: `${prio}`, datatype: terms.xsd.integer,
    });
  }

  /**
   * @param {String} transformId the blank node of a specific transform as retrieved by
   * [getTransforms]{@link Pipeline#getTransforms}.
   * @returns {String} one of the values specified in {@link Pipeline#transformTypes}.
   */
  getTransformType(transformId) {
    return this._graph.findFirstValue(transformId, terms.pipeline.transformType);
  }

  /**
   *
   * @param {String} transformId the blank node of a specific transform as retrieved by
   * [getTransforms]{@link Pipeline#getTransforms}.
   * @param {String} transformType one of the options in {@link Pipeline#transformTypes}.
   */
  setTransformType(transformId, transformType) {
    this._graph.findAndRemove(transformId, terms.pipeline.transformType);
    this._graph.addL(transformId, terms.pipeline.transformType, transformType);
  }

  /**
   * @param {String} transformId the blank node of a specific transform as retrieved
   * by [getTransforms]{@link Pipeline#getTransforms}.  If no id is provided
   * arguments from all transforms will be returned in a single merged object.
   * @returns {Object|undefined} the arguments for a transform (or all transforms) as an object
   * hash with property value pairs.
   */
  getTransformArguments(transformId) {
    let args;
    const stmts = this._graph.find(transformId, terms.pipeline.transformArgument);
    stmts.forEach((stmt) => {
      const key = this._graph.findFirstValue(stmt.getValue(),
        terms.pipeline.transformArgumentKey);
      const value = this._graph.findFirstValue(stmt.getValue(),
        terms.pipeline.transformArgumentValue);
      args = args || {};
      args[key] = value;
    }, this);

    return args;
  }

  /**
   * @param {String} transformId the blank node of a specific transform as retrieved
   * by [getTransforms]{@link Pipeline#getTransforms}.
   * @returns {Array} of arguments' keys
   */
  getTransformArgumentsKeys(transformId = null) {
    const args = [];
    if (transformId) {
      const stmts = this._graph.find(transformId, terms.pipeline.transformArgument);
      stmts.forEach((stmt) => {
        const keys = this._graph.find(stmt.getValue(), terms.pipeline.transformArgumentKey);
        args.push(keys.map(key => key.getValue()));
      }, this);
    }
    return args;
  }

  /**
   * Replaces the current arguments with those provided.
   * @param {String} transformId the blank node of a specific transform as retrieved by
   * [getTransforms]{@link Pipeline#getTransforms}.
   * @param {Object} args the arguments for the transform as an object hash with property value pairs.
   */
  setTransformArguments(transformId, args) {
    const stmts = this._graph.find(transformId, terms.pipeline.transformArgument);
    stmts.forEach((stmt) => {
      this._graph.findAndRemove(stmt.getValue(), terms.pipeline.transformArgumentKey);
      this._graph.findAndRemove(stmt.getValue(), terms.pipeline.transformArgumentValue);
      this._graph.remove(stmt);
    }, this);
    Object.keys(args).forEach((key) => {
      const newArg = this._graph.add(transformId, terms.pipeline.transformArgument);
      this._graph.addL(newArg.getValue(), terms.pipeline.transformArgumentKey, key);
      this._graph.addL(newArg.getValue(), terms.pipeline.transformArgumentValue, args[key]);
    });
  }

  /**
   * Retrieves a transform argument value for a specific transform type and property (key).
   * @param {string} transformType
   * @param {string} property
   * @returns {*|undefined}
   */
  getTransformProperty(transformType, property) {
    const tid = this.getTransformForType(transformType);
    if (tid) {
      const obj = this.getTransformArguments(tid);
      if (obj && property in obj) {
        return obj[property];
      }
    }
    return undefined;
  }

  /**
   * Sets or updates an individual property (key-value pair in arguments) of a transform.
   * The transform is identified either explicitly by an id or via a transformType (assumed
   * unique).
   * @param {string} transformIdOrType corresponds to the transform to change the property for
   * @param {string} key
   * @param {string} value
   */
  setTransformProperty(transformIdOrType, key, value) {
    let obj = this.getTransformArguments(transformIdOrType);
    if (obj != null) {
      obj[key] = value;
      this.setTransformArguments(transformIdOrType, obj);
    } else {
      const tid = this.getTransformForType(transformIdOrType);
      obj = this.getTransformArguments(tid);
      if (obj != null) {
        obj[key] = value;
        this.setTransformArguments(tid, obj);
      }
    }
  }

  /**
   * Executes the pipeline with the given source entry as input, if not provided the pipeline
   * will be used as sourceentry.
   *
   * @param {Entry} sourceEntry an optional entry containing some data that is to be
   * transformed, e.g. can be a CSV file.
   * @param {object} params additional parameters used in the execution of the pipeline, e.g.
   * action (with value create, replace or append) and datasetURL pointing to the existing
   * dataset in rowstore.
   * @returns {entryURIArrayPromise} an array of entry URIs that where created/modified by
   * this execution.
   */
  execute(sourceEntry, params) {
    let executeURI;
    const es = this.getEntryStore();
    const _params = params || {};
    _params.pipeline = this.getEntryURI();
    if (sourceEntry == null) {
      executeURI = `${es.getBaseURI() + es.getContextId(this.getEntryURI())}/execute`;
    } else {
      _params.source = sourceEntry.getURI();
      executeURI = `${sourceEntry.getContext().getResourceURI()}/execute`;
    }
    return es.handleAsync(es.getREST().post(executeURI, JSON.stringify(_params)), 'execute')
      .then(response => response.body.result, err => {
        throw err
      });
  }
}
/**
 * Available transforms (types).
 *
 * @type {{TABULAR: string, ROWSTORE: string}}
 */
Pipeline.prototype.transformTypes = {
  TABULAR: 'tabular',
  ROWSTORE: 'rowstore',
  EMPTY: 'empty',
  FETCH: 'fetch',
  VALIDATE: 'validate',
  MERGE: 'merge',
};

