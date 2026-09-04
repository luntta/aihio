import assert from 'node:assert/strict';
import test from 'node:test';

import { lintMarkup } from '../src/lint/index.js';

test('lint parser follows HTML parsing rules for raw text and quoted greater-than signs', () => {
  const result = lintMarkup(`
    <script>const example = '<aihio-button variant="primary">';</script>
    <aihio-button size="icon" aria-label="Save > archive"></aihio-button>
  `);

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});

test('lint parser checks components nested in template content', () => {
  const result = lintMarkup(`
    <template>
      <aihio-button variant="primary">Save</aihio-button>
    </template>
  `);

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.ruleId === 'invalid-enum-attribute'));
});
