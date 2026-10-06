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
  {
    file: 'table-without-name.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-table' },
    ],
  },
  {
    // The table a model writes when it reaches for a sortable table from
    // scratch: click handlers on the headers, and a row that navigates.
    file: 'table-hand-rolled-sort.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-table' },
    ],
  },
  {
    file: 'data-grid-without-row-count.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-data-grid' },
    ],
  },
  {
    // The table renders every row it is given; a row count is the grid's.
    file: 'table-row-count.html',
    expectedIssues: [
      { ruleId: 'unknown-attribute', component: 'aihio-table' },
    ],
  },
  {
    file: 'pagination-invented-attributes.html',
    expectedIssues: [
      { ruleId: 'unknown-attribute', component: 'aihio-pagination' },
      { ruleId: 'a11y-contract', component: 'aihio-pagination' },
    ],
  },
  {
    file: 'pagination-href-without-page.html',
    expectedIssues: [
      { ruleId: 'a11y-contract', component: 'aihio-pagination' },
    ],
  },
  {
    // Row and cell components, the shape shadcn/ui's Table is written in.
    file: 'table-shadcn-rows.html',
    expectedIssues: [
      { ruleId: 'unknown-component', component: 'aihio-table-row' },
      { ruleId: 'missing-required-child', component: 'aihio-table' },
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

  // A link written as a button attribute becomes the link the button wraps.
  assert.equal(
    suggestionFor('<aihio-button href="/pricing" target="_blank" variant="outline">See pricing</aihio-button>', 'unknown-attribute'),
    '<aihio-button variant="outline"><a href="/pricing" target="_blank">See pricing</a></aihio-button>'
  );

  // Layout written by hand points at the primitive that replaces it.
  assert.equal(suggestionFor('<div style="display: grid; gap: 1rem">…</div>', 'hand-rolled-layout'), '<aihio-grid>');
  assert.equal(suggestionFor('<div style="display:flex;flex-direction:column">…</div>', 'hand-rolled-layout'), '<aihio-stack>');
  assert.equal(suggestionFor('<div style="display: flex">…</div>', 'hand-rolled-layout'), '<aihio-cluster>');
  assert.equal(
    suggestionFor('<aihio-card-footer><aihio-cluster justify="between"><aihio-button>Save</aihio-button></aihio-cluster></aihio-card-footer>', 'cluster-needs-grow'),
    'grow justify="between"'
  );

  // A table: its own vocabulary, the parts other systems make components of,
  // and attributes on the native cells it reads.
  const table = (head, host = '') => `<aihio-table${host}><table><caption>Invoices</caption><thead><tr>${head}</tr></thead><tbody><tr><td>1</td></tr></tbody></table></aihio-table>`;
  assert.equal(suggestionFor('<aihio-data-table></aihio-data-table>', 'unknown-component'), '<aihio-table>');
  assert.equal(suggestionFor('<aihio-table><aihio-table-row></aihio-table-row></aihio-table>', 'unknown-component'), '<tr>');
  assert.equal(suggestionFor(table('<th>Invoice</th>', ' density="dense"'), 'invalid-enum-attribute'), 'density="compact"');
  assert.equal(suggestionFor(table('<th>Invoice</th>', ' sticky'), 'unknown-attribute'), 'sticky-header');
  assert.equal(suggestionFor(table('<th aria-sort="asc" data-sortable>Invoice</th>'), 'invalid-enum-attribute'), 'aria-sort="ascending"');
  assert.equal(suggestionFor(table('<th sortable>Invoice</th>'), 'table-sortable-header'), 'data-sortable');
  assert.equal(suggestionFor(table('<th data-sort="invoice">Invoice</th>'), 'table-sortable-header'), 'data-sortable="invoice"');

  // Pagination: the names other pagers give the page, the count, and the URL.
  assert.equal(suggestionFor('<aihio-pagination current="3" pages="9"></aihio-pagination>', 'unknown-attribute'), 'page');
  assert.equal(suggestionFor('<aihio-pagination page="3" total="9"></aihio-pagination>', 'unknown-attribute'), 'pages');
  assert.equal(suggestionFor('<aihio-pagination page="3" pages="9" url="/x?page={page}"></aihio-pagination>', 'unknown-attribute'), 'href');
  assert.equal(suggestionFor('<aihio-pager></aihio-pager>', 'unknown-component'), '<aihio-pagination>');

  // The grid: the names of virtualized tables elsewhere, and of its count.
  assert.equal(suggestionFor('<aihio-virtual-table></aihio-virtual-table>', 'unknown-component'), '<aihio-data-grid>');
  assert.equal(suggestionFor('<aihio-datagrid></aihio-datagrid>', 'unknown-component'), '<aihio-data-grid>');
  assert.equal(suggestionFor('<aihio-data-grid rows="5000"><table aria-label="Rows"><thead><tr><th>A</th></tr></thead></table></aihio-data-grid>', 'unknown-attribute'), 'row-count');
  assert.deepEqual(
    lintMarkup('<aihio-data-grid :row-count="rows.length"><table aria-label="Rows"><thead><tr><th>A</th></tr></thead></table></aihio-data-grid>').issues,
    [],
    'a bound row-count is set at runtime'
  );

  // A template binding is a value set at runtime, not a missing one.
  const pagination = (attributes) => lintMarkup(`<aihio-pagination ${attributes}></aihio-pagination>`).issues.map((issue) => issue.contract ?? issue.ruleId);
  assert.deepEqual(pagination(':page="page" :pages="pageCount"'), []);
  assert.deepEqual(pagination('page="{page}" pages="{pageCount}"'), []);
  assert.deepEqual(pagination('page="13" pages="12"'), ['pagination-pages']);

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

test('a11y-contract issues name the obligation they enforce', async () => {
  const lintUrl = `${pathToFileURL(resolve(root, 'dist/lint.js')).href}?t=${Date.now()}`;
  const { lintMarkup } = await import(lintUrl);
  const [issue] = lintMarkup('<aihio-button size="icon">&#x2715;</aihio-button>').issues;
  assert.equal(issue.ruleId, 'a11y-contract');
  assert.equal(issue.contract, 'button-accessible-name');
});

test('a boolean attribute written as "false" is reported, on sub-components too', async () => {
  const lintUrl = `${pathToFileURL(resolve(root, 'dist/lint.js')).href}?t=${Date.now()}`;
  const { lintMarkup } = await import(lintUrl);
  const ruleIds = (markup) => lintMarkup(markup).issues.map((issue) => issue.ruleId);

  assert.ok(ruleIds('<aihio-toggle pressed="false">Bold</aihio-toggle>').includes('boolean-attribute-value'));
  assert.ok(ruleIds('<aihio-switch checked="0" aria-label="Weekly summary"></aihio-switch>').includes('boolean-attribute-value'));
  assert.ok(ruleIds(`
    <aihio-tabs value="a">
      <aihio-tab-list><aihio-tab value="a">A</aihio-tab><aihio-tab value="b" disabled="false">B</aihio-tab></aihio-tab-list>
      <aihio-tab-panel value="a">A</aihio-tab-panel><aihio-tab-panel value="b">B</aihio-tab-panel>
    </aihio-tabs>
  `).includes('boolean-attribute-value'));

  // And on the native cells a component reads.
  assert.ok(ruleIds(`
    <aihio-table>
      <table><caption>Invoices</caption><thead><tr><th scope="col" data-numeric="false">Amount</th></tr></thead></table>
    </aihio-table>
  `).includes('boolean-attribute-value'));

  // Presence is what counts, so "true" and a bare attribute are both fine.
  assert.deepEqual(ruleIds('<aihio-toggle pressed="true">Bold</aihio-toggle><aihio-toggle pressed>Italic</aihio-toggle>'), []);
});
