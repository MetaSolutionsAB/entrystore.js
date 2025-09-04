import PrototypeEntry from './PrototypeEntry.js';
import factory from "./factory.js";
import types from './types.js';
import PrototypeContext from "./PrototypeContext.js";

/**
 * A PrototypeContextEntry is a special case of a PrototypeEntry.
 *
 * @exports store/PrototypeEntry
 */
export default class PrototypeContextEntry extends PrototypeEntry {
  /**
   * @param {string} id - identifier for the context entry
   * @param {string} contextName - name of the context entry
   * @param {string} entrystore - entrystore instance
   */
  constructor(id, contextName, entrystore) {
    const contexts = factory.getContext(entrystore, `${entrystore.getBaseURI()}_contexts/entry/_contexts`);
    super(contexts, id)
    this.setGraphType(types.GT_CONTEXT);
    const ei = this.getEntryInfo();
    const resource = new PrototypeContext(ei.getEntryURI(), ei.getResourceURI(), entrystore);
    this._resource = resource;
    if (contextName != null) {
      resource._update({ name: contextName });
    }
  }

  /**
   * Same as getResource(true) but clarify that what is returned is a PrototypeContext.
   *
   * @return {PrototypeContext}
   */
  getPrototypeContext() {
    return this._resource;
  }

  /**
   * Create a new entry according to the information specified in the prototype entry.
   *
   * @returns {Promise<Entry>}
   * @see EntryStore#createEntry
   */
  async commit() {
    const contextEntry = await this._context.getEntryStore().createEntry(this);
    this._resource.updateEntriesForCreatedContext(contextEntry.getResource(true));
    this._initialEntries = await this._resource.createInitialEntries();
    return contextEntry;
  }

  /**
   * Use this method instead of commit if you want to create a group together with the context.
   *
   * @return {Promise<{contextEntry: Entry, groupEntry: Entry, initialEntries: Entry[]}>}
   * @see EntryStore#createGroupAndContext
   */
  async createGroupAndContext() {
    const entrystore = this._context.getEntryStore();
    const groupEntry = await entrystore.createGroupAndContext(this._resource._name, this.specificId);
    const homeContextId = groupEntry.getResource(true).getHomeContext();
    const homeContext = entrystore.getContextById(homeContextId);
    const contextEntry = await homeContext.getEntry();
    this._resource.updateEntriesForCreatedContext(contextEntry.getResource(true));
    this._initialEntries = await this._resource.createInitialEntries();
    return {contextEntry, groupEntry, initialEntries: this._initialEntries};
  }

  /**
   * @return {Entry[]}
   */
  getInitialEntries() {
    return this.getPrototypeContext().getInitialEntries();
  }
};
