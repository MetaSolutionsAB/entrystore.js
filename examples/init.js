window.config = {
  repository: 'http://127.0.0.1:8080/',
  username: 'admin',
  password: 'adminadmin',
  contextId: '1',
  entryId: '2',
};

window.init = (title) => {
  const h1 = document.createElement('h1');
  h1.innerText = title;
  const div = document.createElement('div');
  document.body.prepend(div);
  document.body.prepend(h1);
  return m => {
    div.innerHTML = m;
    if (!m.startsWith('<')) {
      div.classList.add('message');
    }
  }
}