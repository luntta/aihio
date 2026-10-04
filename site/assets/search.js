/* Docs search. Components and patterns are ranked by the same function the
   MCP server's find tool uses (dist/find.js), so "confirm before deleting a
   project" leads here where it leads an agent. Pages, sub-components, and
   semantic tokens are matched by name. Everything loads on first use. */

const dialog = document.getElementById('docs-search');
const input = dialog?.querySelector('[data-search-input]');
const results = dialog?.querySelector('[data-search-results]');
const status = dialog?.querySelector('[data-search-status]');
const root = new URL(document.querySelector('meta[name="docs-root"]')?.content ?? './', location.href);

const SUGGESTIONS = ['confirm before deleting a project', 'pick a country', 'settings page', 'primary-action', 'muted text colour'];

let loading = null;
function load() {
  loading ??= Promise.all([
    fetch(new URL('search-index.json', root)).then((response) => response.json()),
    import(new URL('dist/find.js', root).href),
  ]).then(([index, { rankCatalogue }]) => ({ index, rankCatalogue }));
  return loading;
}

const href = (url) => new URL(url.replace(/^\//, ''), root).href;

function link(url, name, meta) {
  const item = document.createElement('li');
  const anchor = document.createElement('a');
  anchor.href = href(url);
  anchor.className = 'docs-search__link';
  const title = document.createElement('span');
  title.className = 'docs-search__name';
  title.textContent = name;
  anchor.append(title);
  if (meta) {
    const detail = document.createElement('span');
    detail.className = 'docs-search__meta';
    detail.textContent = meta;
    anchor.append(detail);
  }
  item.append(anchor);
  return item;
}

function group(heading, items) {
  if (items.length === 0) return null;
  const section = document.createElement('section');
  section.className = 'docs-search__group';
  const title = document.createElement('h3');
  title.textContent = heading;
  const list = document.createElement('ul');
  list.append(...items);
  section.append(title, list);
  return section;
}

function suggestions() {
  const items = SUGGESTIONS.map((query) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'docs-search__suggestion';
    button.textContent = query;
    button.addEventListener('click', () => {
      input.value = query;
      search();
      input.focus();
    });
    item.append(button);
    return item;
  });
  results.replaceChildren(group('Try', items));
  status.textContent = '';
}

async function search() {
  const query = input.value.trim();
  if (!query) return suggestions();

  const { index, rankCatalogue } = await load();
  if (query !== input.value.trim()) return; // a newer search is on its way

  const found = rankCatalogue(query, index, { limit: 6 });
  const needle = query.toLowerCase();
  const pages = index.pages.filter((page) => page.title.toLowerCase().includes(needle)).slice(0, 6);
  const tokens = needle.length >= 3
    ? index.tokens.filter((token) => token.name.includes(needle.replace(/\s+/g, '-'))).slice(0, 8)
    : [];

  const tokenGroup = group('Tokens', tokens.map((token) => link(token.url, token.name)));
  // A hyphenated query that names a token ("page-bg") is a token lookup first.
  const tokenFirst = !found.intent && needle.includes('-') && tokens.length > 0;
  const groups = [
    found.intent && group(`Intent: ${found.intent.name}`, [link(`/intents/#${found.intent.name}`, found.intent.name, found.intent.description)]),
    tokenFirst && tokenGroup,
    group('Components', found.components.map((component) => link(component.url, component.name, `<${component.tag}> · ${component.intents.join(', ')}`))),
    group('Patterns', found.patterns.map((pattern) => link(pattern.url, pattern.name, pattern.description))),
    group('Pages', pages.map((page) => link(page.url, page.title))),
    !tokenFirst && tokenGroup,
  ].filter(Boolean);

  const count = groups.reduce((total, section) => total + section.querySelectorAll('li').length, 0);
  if (count === 0) {
    const empty = document.createElement('p');
    empty.className = 'docs-search__empty';
    empty.textContent = `Nothing matches “${query}”. Try what the UI has to do, such as “confirm before deleting”.`;
    results.replaceChildren(empty);
  } else {
    results.replaceChildren(...groups);
  }
  status.textContent = `${count} ${count === 1 ? 'result' : 'results'}`;
}

if (dialog && input && results) {
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(search, 80);
  });
  // Enter goes to the best match.
  dialog.querySelector('[data-search-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await search();
    results.querySelector('a')?.click();
  });
  dialog.addEventListener('aihio-open', () => {
    load();
    if (!input.value) suggestions();
  });

  // Arrow keys move between the field and the results.
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const stops = [input.control ?? input, ...results.querySelectorAll('a, button')];
    const current = stops.indexOf(document.activeElement);
    if (current === -1) return;
    event.preventDefault();
    const next = Math.min(Math.max(current + (event.key === 'ArrowDown' ? 1 : -1), 0), stops.length - 1);
    stops[next].focus();
  });

  // "/" or Cmd/Ctrl+K opens search from anywhere but a field.
  document.addEventListener('keydown', (event) => {
    const typing = event.target.closest?.('input, textarea, select, [contenteditable]');
    const shortcut = (event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing);
    if (!shortcut || dialog.hasAttribute('open')) return;
    event.preventDefault();
    dialog.open();
  });
}
