define([
  'dojo/_base/window',
  'dojo/dom-attr',
  'dojo/dom-construct',
  'dojo/json',
  'dojo/query',
  'store/EntryStore',
  'store/factory',
  'store/html',
  'dojo/domReady!',
], (win, attr, construct, json, query, EntryStore, factory, html) => {
  let entryURI = window._entryURI || window.location.href;
  if (entryURI.indexOf('?') !== -1) {
    entryURI = entryURI.substr(0, entryURI.indexOf('?'));
  }
  const node = construct.create('div', null, win.body(), 'first');
  const es = new EntryStore(window._storeURI);
  const onSuccess = function (entry) {
    construct.create('h1', { innerHTML: `Entry: ${entryURI}` }, node);
    construct.place(html.print(entry), node);

    if (entry.isList()) {
      construct.create('h2', { innerHTML: 'Entry is a list, children below:' }, node);
            // Children
      const list = entry.getResource(true);
      list.setLimit(38);
      list.getEntries().then((children) => {  // TODO handle errors
        construct.create('h3', { innerHTML: `List loaded with ${children.length} children.` }, node);
        children.forEach((child) => {
          construct.place(html.print(child), node);
        });
      });
    }
  };

  const nl = query('textarea');
  if (nl.length > 0) {
    let data = attr.get(nl[0], 'value');
    data = json.parse(data);
    onSuccess(factory.updateOrCreate(entryURI, data, es));
  } else {
    es.getEntry(entryURI).then(onSuccess); // TODO handle errors.
  }
});
