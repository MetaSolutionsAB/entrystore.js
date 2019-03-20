const es = new EntryStore.EntryStore(config.repository);
const search = () => {
  const property = document.getElementById('property').value;
  const searchTerm = document.getElementById('value').value;
  const related = document.getElementById('related').checked;

  document.getElementById('_resultsNode').innerHTML = '';
  const resEl = document.getElementById('_resultsNode');

  es.newSolrQuery()
    .literalProperty(property, searchTerm, undefined, 'text', related)
    .literalFacet('http://schema.org/addressLocality', related)
    .forEach((child) => {
      const node = document.createElement('div');
      node.innerHTML = EntryStore.html.print(child);
      resEl.appendChild(node);
    });
};
document.getElementById('search').onclick = search;
