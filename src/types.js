/**
 * Types is a module containing the three different types: GraphType, EntryType and
 * ResourceType shortened GT, ET and RT.
 *
 * @namespace types
 */
const types = {
  /**
   * Local entrytype implies that the resource is maintained in the repository.
   * It can be an uploaded file, a list, a group, a user etc. The nature of the resource
   * is determined by the graphtype.
   *
   * @const
   * @see Entry#isLocal
   */
  ET_LOCAL: 'Local',

  /**
   * Link EntryType implies that the resource is not maintained in the repository, rather the
   * entry only provides a link to the resource.
   * The metadata is still maintained in the repository though.
   *
   * @const
   * @see Entry#isLink
   */
  ET_LINK: 'Link',

  /**
   * Similar to link, only the metadata is also external to the repository.
   * In many cases it is possible to access a locally cached version of the external
   * metadata though.
   * @see Entry#getCachedExternalMetadata
   * @see Entry#isReference
   */
  ET_REF: 'Reference',

  /**
   * Similar to link and reference, only there is both local metadata and external metadata.
   * @see Entry#isLinkReference
   */
  ET_LINKREF: 'LinkReference',

  /**
   * No graph type specified means that no knowledge of the resources character is known.
   * Hence, no special treatment of the resource is expected.
   * This is common when handling regular files, web resources or abstract entities.
   * @see Entry#isNone
   */
  GT_NONE: 'None',

  /**
   * The resource is a context, i.e. a container for other entries.
   *
   * @see Entry#isContext
   * @see Context
   */
  GT_CONTEXT: 'Context',

  /**
   * The resource is one of the special context of this repository, e.g. _contexts or _principals.
   * @see Entry#isSystemContext
   */
  GT_SYSTEMCONTEXT: 'Systemcontext',

  /**
   * The resource is a user.
   *
   * @see Entry#isUser
   * @see User
   */
  GT_USER: 'User',

  /**
   * The resource is a group.
   *
   * @see Entry#isGroup
   * @see Group
   */
  GT_GROUP: 'Group',

  /**
   * The resource is a list.
   *
   * @see Entry#isList
   * @see List
   */
  GT_LIST: 'List',

  /**
   * @todo remains to be supported in this API
   * @see Entry#isResultList
   */
  GT_RESULTLIST: 'Resultlist',

  /**
   * The resource is a RDF graph.
   * @see Entry#isGraph
   * @see Graph
   */
  GT_GRAPH: 'Graph',

  /**
   * The resource is a string.
   * @see Entry#isString
   * @see String
   */
  GT_STRING: 'String',

  /**
   * The resource is a pipeline, e.g. an entry that can somehow be executed on the server side.
   * @see Entry#isPipeline
   * @see Pipeline
   */
  GT_PIPELINE: 'Pipeline',

  /**
   * The resource is a pipelineresult, e.g. the result of the execution of a pipeline
   * on the server side.
   * @see Entry#isPipelineResult
   * @see Pipeline
   */
  GT_PIPELINERESULT: 'PipelineResult',

  /**
   * The resource is available as a digital representation of some sort.
   * Opposite to resources that have no representation, referred to as
   * {@link types.NAMEDRESOURCE named}.
   */
  RT_INFORMATIONRESOURCE: 'Information',

  /**
   * The resource is resolvable to another address.
   * @todo the API has little support for this type currently.
   */
  RT_RESOLVABLEINFORMATIONRESOURCE: 'Resolvable',

  /**
   * The resource is not available digitally, i.e. it has now digital representation that
   * can be transferred over a network.
   */
  RT_NAMEDRESOURCE: 'Named',

  /**
   * It is unknown if the resource has a representation or not, typically this is the case when
   * large amounts of resources are harvested from another system and it is not feasible to try
   * to load them to check weather they have a digital representation or not. At least the check
   * cannot be done initially and therefore the type is set to unknown.
   */
  RT_UNKNOWN: 'Unknown',
};

export default types;
