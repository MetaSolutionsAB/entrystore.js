/*
 * The exposed EntryStore API
 */

import { factory } from './factory';
import { html } from './html';
import { promiseUtil } from './promiseUtil';
import { Rest as rest } from './Rest';
import { SolrQuery as solr } from './SolrQuery';
import { types } from './types';


import { Auth } from './Auth';
import { Cache } from './Cache';
import { Context } from './Context';
import { Entry } from './Entry';
import { EntryInfo } from './EntryInfo';
import { EntryStore } from './EntryStore';
import { EntryStoreUtil } from './EntryStoreUtil';
import { FileResource as File } from './File';
import { GraphResource as Graph } from './Graph';
import { Group } from './Group';
import { List } from './List';
import { Pipeline } from './Pipeline';
import { PrototypeEntry } from './PrototypeEntry';
import { Resource } from './Resource';
import { SearchList } from './SearchList';
import { StringResource as String } from './String';
import { User } from './User';




export {
  factory,
  html,
  promiseUtil,
  rest,
  solr,
  types,
  Auth,
  Cache,
  Context,
  Entry,
  EntryInfo,
  EntryStore,
  EntryStoreUtil,
  File,
  Graph,
  Group,
  List,
  Pipeline,
  PrototypeEntry,
  Resource,
  SearchList,
  String,
  User,
};

export default EntryStore;
