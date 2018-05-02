  /**
   * Types is a module containing the three different types: GraphType, EntryType and
   * ResourceType shortened GT, ET and RT.
   *
   * @exports {store/types}
   */
  const types = {
    /**
     * Local entrytype implies that the resource is maintained in the repository.
     * It can be an uploaded file, a list, a group, a user etc. The nature of the resource
     * is determined by the graphtype.
     *
     * @const
     * @see store/Entry#isLocal
     */
    ET_LOCAL: 'Local',

    /**
     * Link EntryType implies that the resource is not maintained in the repository, rather the
     * entry only provides a link to the resource.
     * The metadata is still maintained in the repository though.
     *
     * @const
     * @see store/Entry#isLink
     */
    ET_LINK: 'Link',

    /**
     * Similar to link, only the metadata is also external to the repository.
     * In many cases it is possible to access a locally cached version of the external
     * metadata though.
     * @see store/Entry#getCachedExternalMetadata
     * @see store/Entry#isReference
     */
    ET_REF: 'Reference',

    /**
     * Similar to link and reference, only there is both local metadata and external metadata.
     * @see store/Entry#isLinkReference
     */
    ET_LINKREF: 'Linkreference',

    /**
     * No graph type specified means that no knowledge of the resources character is known.
     * Hence, no special treatment of the resource is expected.
     * This is common when handling regular files, web resources or abstract entities.
     * @see store/Entry#isNone
     */
    GT_NONE: 'None',

    /**
     * The resource is a context, i.e. a container for other entries.
     *
     * @see store/Entry#isContext
     * @see store/Context
     */
    GT_CONTEXT: 'Context',

    /**
     * The resource is one of the special context of this repository, e.g. _contexts or _principals.
     * @see store/Entry#isSystemContext
     */
    GT_SYSTEMCONTEXT: 'Systemcontext',

    /**
     * The resource is a user.
     *
     * @see store/Entry#isUser
     * @see store/User
     */
    GT_USER: 'User',

    /**
     * The resource is a group.
     *
     * @see store/Entry#isGroup
     * @see store/Group
     */
    GT_GROUP: 'Group',

    /**
     * The resource is a list.
     *
     * @see store/Entry#isList
     * @see store/List
     */
    GT_LIST: 'List',

    /**
     * @todo remains to be supported in this API
     * @see store/Entry#isResultList
     */
    GT_RESULTLIST: 'Resultlist',

    /**
     * The resource is a RDF graph.
     * @see store/Entry#isGraph
     * @see store/Graph
     */
    GT_GRAPH: 'Graph',

    /**
     * The resource is a string.
     * @see store/Entry#isString
     * @see store/String
     */
    GT_STRING: 'String',

    /**
     * The resource is a pipeline, e.g. an entry that can somehow be executed on the server side.
     * @see store/Entry#isPipeline
     * @see store/Pipeline
     */
    GT_PIPELINE: 'Pipeline',

    /**
     * The resource is a pipelineresult, e.g. the result of the execution of a pipeline
     * on the server side.
     * @see store/Entry#isPipelineResult
     * @see store/Pipeline
     */
    GT_PIPELINERESULT: 'PipelineResult',

    /**
     * The resource is available as a digital representation of some sort.
     * Opposite to resources that have no representation, referred to as
     * {@link store/types.NAMEDRESOURCE named}.
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

  export { types };
