/*
 * The exposed EntryStore API
 */

import { default as EntryStore } from './EntryStore';
import { default as EntryStoreUtil } from './EntryStoreUtil';
import { default as terms } from './terms';
import { default as types } from './types';
import { default as Cache } from './Cache';

EntryStore.util = EntryStoreUtil;
EntryStore.terms = terms;
EntryStore.types = types;
EntryStore.Cache = Cache;

export default EntryStore;
