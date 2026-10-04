import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { parse } from 'parse5';

const root = resolve(import.meta.dirname, '..');
const siteRoot = resolve(root, '_site');

function readSitePage(path) {
  return readFileSync(resolve(siteRoot, path), 'utf8');
}

function listSitePages(dir = siteRoot) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'dist' ? [] : listSitePages(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

function findElements(node, predicate, found = []) {
  for (const child of node.childNodes ?? []) {
    if (!child.tagName) continue;
    if (predicate(child)) found.push(child);
    findElements(child.tagName === 'template' ? child.content : child, predicate, found);
  }
  return found;
}

function getAttr(node, name) {
  return node.attrs?.find((attr) => attr.name === name)?.value ?? null;
}

test('docs build emits relative asset links for the overview page', () => {
  const overview = readSitePage('index.html');

  assert.match(overview, /<link rel="stylesheet" href="dist\/aihio\.css">/);
  assert.match(overview, /<link rel="stylesheet" href="assets\/docs\.css">/);
  assert.match(overview, /<script type="module" src="dist\/aihio\.js"><\/script>/);
  assert.doesNotMatch(overview, /href="\/dist\/aihio\.css"/);
  assert.doesNotMatch(overview, /href="\/assets\/docs\.css"/);
  assert.doesNotMatch(overview, /src="\/dist\/aihio\.js"/);
});

test('docs build emits relative asset links for nested component pages', () => {
  const componentPage = readSitePage('components/button/index.html');

  assert.match(componentPage, /<link rel="stylesheet" href="\.\.\/\.\.\/dist\/aihio\.css">/);
  assert.match(componentPage, /<link rel="stylesheet" href="\.\.\/\.\.\/assets\/docs\.css">/);
  assert.match(componentPage, /<script type="module" src="\.\.\/\.\.\/dist\/aihio\.js"><\/script>/);
  assert.match(componentPage, /<a class="docs-brand" href="\.\.\/\.\.\/">/);
  assert.doesNotMatch(componentPage, /href="\/dist\/aihio\.css"/);
  assert.doesNotMatch(componentPage, /href="\/assets\/docs\.css"/);
  assert.doesNotMatch(componentPage, /src="\/dist\/aihio\.js"/);
});

// aihio-dialog opens with showModal(), which no preview frame can contain: an
// open one covers the page and makes the rest of it inert.
test('no docs page renders a dialog open on load, and every dialog can be opened', () => {
  for (const path of listSitePages()) {
    const document = parse(readFileSync(path, 'utf8'));
    const page = relative(siteRoot, path);
    const dialogs = findElements(document, (node) => node.tagName === 'aihio-dialog');
    const invoked = new Set(findElements(document, (node) => getAttr(node, 'commandfor') !== null).map((node) => getAttr(node, 'commandfor')));

    for (const dialog of dialogs) {
      assert.equal(getAttr(dialog, 'open'), null, `${page}: an aihio-dialog renders open`);

      let nested = false;
      for (let current = dialog.parentNode; current; current = current.parentNode) {
        if (current.tagName === 'aihio-dialog') nested = true;
      }
      if (nested) continue;
      assert.ok(invoked.has(getAttr(dialog, 'id')), `${page}: aihio-dialog#${getAttr(dialog, 'id')} has no trigger`);
    }
  }
});
