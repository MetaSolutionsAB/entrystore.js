import config from './config.js';

const es = new EntryStore.EntryStore(config.repository);
document.getElementById('search').onclick = () => {
  const searchTerm = document.getElementById('input').value;
  es.newSolrQuery()
    .title(searchTerm).list().getEntries(0)
    .then((children) => {
      document.getElementById('_resultsNode').innerHTML = '';
      const resEl = document.getElementById('_resultsNode');
      children.forEach((child) => {
        const node = document.createElement('div');
        node.innerHTML = EntryStore.html.print(child);
        resEl.appendChild(node);
      });
    });
};
