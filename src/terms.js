import types from './types';
const namespaces = require('rdfjson/namespaces');

const inv = (obj) => {
  const iobj = {};
  Object.keys(obj).forEach((key) => {
    iobj[obj[key]] = key;
  });
  return iobj;
};

// Namespaces
const ns = 'http://entrystore.org/terms/';
const rdfns = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const xsdns = 'http://www.w3.org/2001/XMLSchema#';
namespaces.add('prov', 'http://www.w3.org/ns/prov#');

const terms = {
  homeContext: `${ns}homeContext`,
  resource: `${ns}resource`,
  metadata: `${ns}metadata`,
  externalMetadata: `${ns}externalMetadata`,
  reasoningFacts: `${ns}reasoningFacts`,
  status: {
    property: `${ns}status`,
    InProgress: `${ns}InProgress`,
    Pending: `${ns}Pending`,
    Succeeded: `${ns}Success`,
    Failed: `${ns}Failed`,
  },
  rdf: {
    type: `${rdfns}type`,
  },
  pipeline: {
    pipeline: `${ns}pipeline`,
    pipelineData: `${ns}pipelineData`,
    transform: `${ns}transform`,
    transformPriority: `${ns}transformPriority`,
    transformType: `${ns}transformType`,
    transformArgument: `${ns}transformArgument`,
    transformArgumentKey: `${ns}transformArgumentKey`,
    transformArgumentValue: `${ns}transformArgumentValue`,
    transformDestination: `${ns}transformDestination`,
    transformDetectDestination: `${ns}transformDetectDestination`,
  },
  acl: {
    read: `${ns}read`,
    write: `${ns}write`,
  },
  xsd: {
    integer: `${xsdns}integer`,
    float: `${xsdns}float`,
    boolean: `${xsdns}boolean`,
  },
};

// EntryType
const et = {};
et[`${ns}Local`] = types.ET_LOCAL;
et[`${ns}Link`] = types.ET_LINK;
et[`${ns}LinkReference`] = types.ET_LINKREF;
et[`${ns}Reference`] = types.ET_REF;
et.default = types.ET_LOCAL;   // The default option
terms.entryType = et;
terms.invEntryType = inv(et);

// GraphType
const gt = {};
gt[`${ns}None`] = types.GT_NONE;
gt[`${ns}Context`] = types.GT_CONTEXT;
gt[`${ns}SystemContext`] = types.GT_SYSTEMCONTEXT;
gt[`${ns}User`] = types.GT_USER;
gt[`${ns}Group`] = types.GT_GROUP;
gt[`${ns}List`] = types.GT_LIST;
gt[`${ns}ResultList`] = types.GT_RESULTLIST;
gt[`${ns}Graph`] = types.GT_GRAPH;
gt[`${ns}Pipeline`] = types.GT_PIPELINE;
gt[`${ns}PipelineResult`] = types.GT_PIPELINERESULT;
gt[`${ns}String`] = types.GT_STRING;
gt.default = types.GT_NONE; // The default option
terms.graphType = gt;
terms.invGraphType = inv(gt);

// ResourceType
const rt = {};
rt[`${ns}InformationResource`] = types.RT_INFORMATIONRESOURCE;
rt[`${ns}ResolvableInformationResource`] = types.RT_RESOLVABLEINFORMATIONRESOURCE;
rt[`${ns}NamedResource`] = types.RT_NAMEDRESOURCE;
rt[`${ns}Unknown`] = types.RT_UNKNOWN;
rt.default = types.RT_INFORMATIONRESOURCE; // The default option
terms.resourceType = rt;
terms.invResourceType = inv(rt);

export default terms;
