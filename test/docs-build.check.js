import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import { parse, serialize } from 'parse5';

import { lintMarkup } from '../dist/lint.js';

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

// The site is built with the components it documents, so its own markup is
// held to the same linter as everyone else's. Example previews are left out:
// counterexamples there are wrong on purpose.
test('the docs site markup outside example previews passes aihio lint', () => {
  const isPreview = (node) => (node.attrs ?? []).some(
    (attr) => attr.name === 'class' && /\bdocs-example__preview\b/.test(attr.value)
  );
  const strip = (node) => {
    node.childNodes = (node.childNodes ?? []).filter((child) => !isPreview(child));
    for (const child of node.childNodes) strip(child.tagName === 'template' ? child.content : child);
  };

  for (const path of listSitePages()) {
    const document = parse(readFileSync(path, 'utf8'));
    strip(document);
    const [body] = findElements(document, (node) => node.tagName === 'body');
    const { issues } = lintMarkup(serialize(body), { source: relative(siteRoot, path) });
    assert.deepEqual(
      issues.map((issue) => `${issue.source}: ${issue.ruleId}: ${issue.message}`),
      [],
    );
  }
});

// Every link the site makes goes somewhere: the file exists, and a #fragment
// names an element on the page it points to. Example previews are skipped;
// their links (/profile, /pricing) are the example's, and the docs catch them
// before they navigate. So are inert subtrees, such as the pattern thumbnails,
// whose links nobody can follow.
test('every docs link resolves, including its #fragment', () => {
  const idsByPage = new Map();
  const idsOf = (path) => {
    if (!idsByPage.has(path)) {
      const document = parse(readFileSync(path, 'utf8'));
      idsByPage.set(path, new Set(findElements(document, (node) => getAttr(node, 'id') !== null).map((node) => getAttr(node, 'id'))));
    }
    return idsByPage.get(path);
  };
  const broken = [];

  for (const path of listSitePages()) {
    const document = parse(readFileSync(path, 'utf8'));
    const previews = findElements(
      document,
      (node) => /\bdocs-example__preview\b/.test(getAttr(node, 'class') ?? '') || getAttr(node, 'inert') !== null
    );
    const inPreview = new Set(previews.flatMap((preview) => findElements(preview, () => true)));

    for (const link of findElements(document, (node) => node.tagName === 'a' && getAttr(node, 'href') !== null)) {
      if (inPreview.has(link)) continue;
      const href = getAttr(link, 'href');
      if (/^(?:[a-z]+:|\/\/)/i.test(href)) continue;

      const [file, fragment] = href.split('#');
      let target = file === '' ? path : resolve(dirname(path), file);
      if (file !== '' && (file.endsWith('/') || (existsSync(target) && statSync(target).isDirectory()))) {
        target = resolve(target, 'index.html');
      }

      const page = relative(siteRoot, path);
      if (!existsSync(target)) {
        broken.push(`${page}: ${href} (no such file)`);
      } else if (fragment && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(fragment))) {
        broken.push(`${page}: ${href} (no #${fragment} there)`);
      }
    }
  }

  assert.deepEqual(broken, []);
});

test('no docs page repeats an id', () => {
  for (const path of listSitePages()) {
    const document = parse(readFileSync(path, 'utf8'));
    const seen = new Set();
    for (const node of findElements(document, (element) => getAttr(element, 'id') !== null)) {
      const id = getAttr(node, 'id');
      assert.ok(!seen.has(id), `${relative(siteRoot, path)}: id="${id}" appears twice`);
      seen.add(id);
    }
  }
});
