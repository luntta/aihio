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
    // The glyph case: an icon button with visible content but no label. This is
    // the counterExample the button schema actually ships, and it went
    // unflagged while any text content counted as an accessible name.
    file: 'button-icon-glyph-missing-label.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-button' },
    ],
  },
  {
    // The defect the seeded auth-form pattern itself shipped with.
    file: 'submit-button-outside-form.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-button' },
    ],
  },
  {
    file: 'form-field-without-name.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-input' },
    ],
  },
  {
    file: 'field-without-label.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-field' },
    ],
  },
  {
    file: 'field-control-without-name.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-input' },
    ],
  },
  {
    file: 'combobox-missing-label.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-combobox' },
    ],
  },
  {
    // The second option has no distinct value, so it can never be told apart
    // from the first once chosen.
    file: 'combobox-duplicate-values.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-combobox' },
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
  {
    // A typo in the annotation. Nothing reads the attribute at runtime, so
    // this is invisible without the rule.
    file: 'intent-unknown.html',
    expectedIssues: [
      { ruleId: 'unknown-intent', component: 'aihio-button' },
    ],
  },
  {
    // A real intent on a component that does not offer it: aihio-badge is
    // status/labeling/metadata, and nothing about it acts.
    file: 'intent-mismatch.html',
    expectedIssues: [
      { ruleId: 'intent-mismatch', component: 'aihio-badge' },
    ],
  },
  {
    // show-modal is what a native <dialog> answers, and the natural thing to
    // reach for. aihio-dialog's <dialog> is in its shadow root, so the button
    // renders, activates, and nothing happens.
    file: 'dialog-builtin-command.html',
    expectedIssues: [
      { ruleId: 'invalid-command', component: 'aihio-button' },
    ],
  },
  {
    // Invented attributes are the most common way generated markup goes
    // wrong, and the browser never says so: nothing reads them.
    file: 'invented-attributes.html',
    expectedIssues: [
      { ruleId: 'unknown-attribute', component: 'aihio-button' },
    ],
  },
  {
    // A visible label beside the switch is not a label unless it is
    // associated, which is exactly the settings-row shape a model writes.
    file: 'switch-without-label.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-switch' },
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

test('issues carry a suggestion an agent can apply without reading the message', async () => {
  const lintUrl = `${pathToFileURL(resolve(root, 'dist/lint.js')).href}?t=${Date.now()}`;
  const { lintMarkup } = await import(lintUrl);
  const suggestionFor = (markup, ruleId) =>
    lintMarkup(markup).issues.find((issue) => issue.ruleId === ruleId)?.suggestion;

  // Vocabulary carried over from other design systems.
  assert.equal(suggestionFor('<aihio-button variant="primary">Save</aihio-button>', 'invalid-enum-attribute'), 'variant="default"');
  assert.equal(suggestionFor('<aihio-badge variant="danger">Failed</aihio-badge>', 'invalid-enum-attribute'), 'variant="destructive"');
  assert.equal(suggestionFor('<aihio-modal aria-label="x"></aihio-modal>', 'unknown-component'), '<aihio-dialog>');
  assert.equal(suggestionFor('<aihio-textarea></aihio-textarea>', 'unknown-component'), '<textarea>');
  assert.equal(suggestionFor('<aihio-stack spacing="lg"></aihio-stack>', 'unknown-attribute'), 'gap');
  assert.equal(
    suggestionFor('<aihio-button commandfor="d" command="show-modal">Open</aihio-button><aihio-dialog id="d" aria-label="D"></aihio-dialog>', 'invalid-command'),
    'command="--open"'
  );

  // Typos.
  assert.equal(suggestionFor('<aihio-button variant="outlin">Save</aihio-button>', 'invalid-enum-attribute'), 'variant="outline"');
  assert.equal(suggestionFor('<aihio-dropdwon></aihio-dropdwon>', 'unknown-component'), '<aihio-dropdown>');

  // No suggestion rather than a wrong one.
  assert.equal(suggestionFor('<aihio-button icon="plus">Add</aihio-button>', 'unknown-attribute'), undefined);
  assert.equal(suggestionFor('<aihio-button variant="gradient">Go</aihio-button>', 'invalid-enum-attribute'), undefined);
});

test('global, aria, data, event, and template attributes are never reported as unknown', async () => {
  const lintUrl = `${pathToFileURL(resolve(root, 'dist/lint.js')).href}?t=${Date.now()}`;
  const { lintMarkup } = await import(lintUrl);
  const markup = `
    <aihio-button id="save" class="wide" style="margin: 0" hidden title="Save" lang="en"
      aria-describedby="save" data-track="save" onclick="save()"
      @click="save" :disabled="busy" v-if="ready" x-on:click="save" key="save"
    >Save</aihio-button>
  `;
  const unknown = lintMarkup(markup).issues.filter((issue) => issue.ruleId === 'unknown-attribute');
  assert.deepEqual(unknown, []);
});
