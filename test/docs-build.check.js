import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function readSitePage(path) {
  return readFileSync(resolve(root, '_site', path), 'utf8');
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
