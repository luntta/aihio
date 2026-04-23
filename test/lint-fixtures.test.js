import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const fixturesRoot = resolve(root, 'test/fixtures/lint');

const fixtures = [
  {
    file: 'alert-destructive-empty.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-alert' },
    ],
  },
  {
    file: 'button-icon-missing-label.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-button' },
    ],
  },
  {
    file: 'dropdown-missing-trigger.html',
    expectedIssues: [
      { ruleId: 'missing-required-slot', component: 'aihio-dropdown' },
    ],
  },
  {
    file: 'nested-button.html',
    expectedIssues: [
      { ruleId: 'forbidden-descendant', component: 'aihio-button' },
    ],
  },
  {
    file: 'tabs-mismatched-values.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-tabs' },
    ],
  },
];

test('known-bad markup fixtures are caught by the built linter', async () => {
  const lintUrl = `${pathToFileURL(resolve(root, 'dist/lint.js')).href}?t=${Date.now()}`;
  const { lintMarkup } = await import(lintUrl);

  for (const fixture of fixtures) {
    const markup = readFileSync(resolve(fixturesRoot, fixture.file), 'utf8');
    const result = lintMarkup(markup, { source: fixture.file });

    assert.ok(result.issues.length >= fixture.expectedIssues.length, `${fixture.file} should emit the expected issue count`);

    for (const expectedIssue of fixture.expectedIssues) {
      assert.ok(
        result.issues.some(
          (issue) =>
            issue.ruleId === expectedIssue.ruleId &&
            issue.component === expectedIssue.component
        ),
        `${fixture.file} should emit ${expectedIssue.ruleId} for ${expectedIssue.component}`
      );
    }
  }
});
