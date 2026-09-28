import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');

test('dist CSS includes generated light DOM component styles', () => {
  const css = readFileSync(resolve(root, 'dist/aihio.css'), 'utf8');

  assert.match(css, /aihio-button/);
  assert.match(css, /aihio-input input/);
  assert.match(css, /aihio-dialog-footer/);
  assert.match(css, /aihio-dropdown-item/);
});

test('dist CSS exposes intent tokens and component styles consume them', () => {
  const css = readFileSync(resolve(root, 'dist/aihio.css'), 'utf8');

  assert.match(css, /--color-zinc-900:\s*\.?2316 \.?0038 286;/);
  assert.match(css, /--color-red-500:\s*\.?63 \.?196 25;/);

  // The neutral ramp runs to true white and true black, so a page canvas is
  // untinted in both themes rather than a very light or very dark grey.
  assert.match(css, /--color-zinc-0:\s*1 0 0;/);
  assert.match(css, /--color-zinc-1000:\s*0 0 0;/);
  assert.match(css, /--background:\s*var\(--color-zinc-0\)/);
  assert.match(css, /--card:\s*var\(--color-zinc-50\)/);

  // Typography is tokenised too: components must not hardcode a font stack or
  // a tracking value.
  assert.match(css, /--fontFamily-intent-body:\s*var\(--fontFamily-sans\)/);
  assert.match(css, /--letterSpacing-intent-heading:\s*var\(--letterSpacing-heading\)/);
  assert.match(css, /--color-intent-action-primary-bg:\s*var\(--primary\)/);
  assert.match(css, /--spacing-intent-control-gap:\s*var\(--spacing-2\)/);
  assert.match(css, /--radius-intent-interactive:\s*var\(--radius-md\)/);
  assert.match(css, /oklch\(var\(--color-intent-action-primary-bg\)\)/);
  assert.match(css, /var\(--spacing-intent-control-gap\)/);
  assert.match(css, /var\(--radius-intent-surface\)/);
});

test('intent token vocabulary markdown is generated into dist', () => {
  const doc = readFileSync(resolve(root, 'dist/intent-tokens.md'), 'utf8');

  assert.match(doc, /^# Aihio Intent Tokens/m);
  assert.match(doc, /`color\.intent\.action-primary-bg`/);
  assert.match(doc, /`spacing\.intent\.form-field-gap`/);
  assert.match(doc, /`radius\.intent\.interactive`/);
});

test('schema output is sorted and includes all components', () => {
  const schema = JSON.parse(readFileSync(resolve(root, 'dist/schema.json'), 'utf8'));
  const components = schema.components.map((component) => component.$component);
  const sorted = [...components].sort((left, right) => left.localeCompare(right));

  assert.deepEqual(components, sorted);
  assert.equal(components.length, 14);
  assert.equal(components[0], 'aihio-alert');
  assert.equal(components.at(-1), 'aihio-toggle');

  // The layout tier: without these, composing a page means hand-rolled CSS
  // outside the system.
  for (const layout of ['aihio-stack', 'aihio-cluster', 'aihio-field']) {
    assert.ok(components.includes(layout), `${layout} is part of the system`);
  }
});

test('schema output includes the seeded patterns library with inlined markup', () => {
  const schema = JSON.parse(readFileSync(resolve(root, 'dist/schema.json'), 'utf8'));
  const patternIds = schema.patterns.map((pattern) => pattern.id);
  const sorted = [...patternIds].sort((left, right) => left.localeCompare(right));
  const components = new Set(schema.components.map((component) => component.$component));

  assert.deepEqual(patternIds, sorted);
  assert.equal(patternIds.length, 8);
  assert.equal(patternIds[0], 'auth-form');
  assert.equal(patternIds.at(-1), 'toast-alert-stack');

  for (const pattern of schema.patterns) {
    assert.ok(Array.isArray(pattern.intents) && pattern.intents.length > 0, `${pattern.id} declares pattern intents`);
    assert.ok(Array.isArray(pattern.requiredComponents) && pattern.requiredComponents.length > 0, `${pattern.id} declares required components`);
    assert.ok(typeof pattern.markup === 'string' && pattern.markup.includes('aihio-'), `${pattern.id} includes base markup`);

    for (const component of pattern.requiredComponents) {
      assert.ok(components.has(component), `${pattern.id}: required component ${component} exists in merged schema`);
    }

    for (const variation of pattern.variations) {
      assert.ok(typeof variation.markup === 'string' && variation.markup.includes('aihio-'), `${pattern.id}/${variation.id} includes variation markup`);
    }
  }

  assert.ok(
    schema.patterns.some((pattern) => pattern.markup.includes('data-aihio-intent="primary-action"')),
    'patterns annotate component usage by intent'
  );
});

test('generated TypeScript declarations snapshot the button API and JSX surface', () => {
  const declarations = readFileSync(resolve(root, 'dist/aihio.d.ts'), 'utf8');
  const componentDeclarations = readFileSync(resolve(root, 'dist/components.d.ts'), 'utf8');
  const expectedButtonSnapshot = `export interface AihioButtonAttributes {
  variant?: AihioButtonVariant;
  size?: AihioButtonSize;
  disabled?: boolean;
  loading?: boolean;
  type?: AihioButtonType;
  name?: string;
  value?: string;
  form?: string;
  formaction?: string;
  formmethod?: AihioButtonFormmethod;
  formenctype?: AihioButtonFormenctype;
  formnovalidate?: boolean;
  formtarget?: string;
}
export type AihioButtonProps = AihioIntrinsicElementProps & AihioButtonAttributes;

export declare class AihioButton extends HTMLElement {
  static tag: "aihio-button";
  static schemaVersion: string | undefined;
  readonly control: HTMLButtonElement | null;
  readonly form: HTMLFormElement | null;
  type: "button" | "submit" | "reset";
  click(): void;
  focus(options?: FocusOptions): void;
  blur(): void;
}`;

  assert.match(declarations, /export type AihioIntent = "action" \| "primary-action"/);
  assert.match(
    declarations,
    /export type AihioVariant = "default" \| "success" \| "warning" \| "destructive" \| "secondary" \| "outline" \| "ghost" \| "link";/
  );
  assert.ok(declarations.includes(expectedButtonSnapshot), 'button declaration block matches the expected snapshot');
  assert.match(declarations, /interface AihioJSXIntrinsicElements/);
  assert.match(declarations, /"aihio-button": AihioButtonProps;/);
  assert.match(componentDeclarations, /export \{\s+.*AihioButton,/s);
  assert.match(componentDeclarations, /export type \{\s+.*AihioButtonAttributes,/s);
});

test('canonical prompt fragment is generated as markdown and as an importable module', async () => {
  const promptMarkdown = readFileSync(resolve(root, 'dist/aihio.prompt.md'), 'utf8');
  const promptTypes = readFileSync(resolve(root, 'dist/prompt.d.ts'), 'utf8');
  const promptUrl = `${pathToFileURL(resolve(root, 'dist/prompt.js')).href}?t=${Date.now()}`;
  const { default: prompt } = await import(promptUrl);

  assert.match(promptMarkdown, /^# Aihio Prompt Fragment/m);
  assert.match(promptMarkdown, /^## Component Inventory/m);
  assert.match(promptMarkdown, /`aihio-button` - A button component with multiple visual variants and sizes\./);
  assert.match(promptMarkdown, /^## Pattern Inventory/m);
  assert.match(promptMarkdown, /`auth-form` -/);
  assert.match(promptMarkdown, /^## Hard Rules from Counterexamples/m);
  assert.match(promptMarkdown, /variant="primary"/);
  assert.match(promptMarkdown, /^## Token Intent Vocabulary/m);
  assert.match(promptMarkdown, /`color\.intent\.action-primary-bg` - Default filled action background\./);
  assert.equal(prompt, promptMarkdown, 'prompt module default export matches the generated markdown');
  assert.match(promptTypes, /declare const prompt: string;/);
});

test('built lint API and CLI return structured issues for invalid markup', async () => {
  const lintUrl = `${pathToFileURL(resolve(root, 'dist/lint.js')).href}?t=${Date.now()}`;
  const cliUrl = `${pathToFileURL(resolve(root, 'dist/aihio-lint.js')).href}?t=${Date.now()}`;
  const { lintMarkup } = await import(lintUrl);
  const { runCli } = await import(cliUrl);
  const badMarkup = `
    <aihio-button variant="primary" size="icon"></aihio-button>
    <aihio-dropdown>
      <aihio-dropdown-item>Profile</aihio-dropdown-item>
    </aihio-dropdown>
    <aihio-tabs value="one">
      <aihio-tab-list>
        <aihio-tab value="one">One</aihio-tab>
      </aihio-tab-list>
      <aihio-tab-panel value="two">Two</aihio-tab-panel>
    </aihio-tabs>
  `;
  const fixtureDir = mkdtempSync(resolve(tmpdir(), 'aihio-lint-'));
  const fixturePath = resolve(fixtureDir, 'fixture.html');
  writeFileSync(fixturePath, badMarkup, 'utf8');

  try {
    const result = lintMarkup(badMarkup, { source: 'fixture.html' });
    let cliOutput = '';
    const cliStatus = runCli({
      argv: [fixturePath],
      write: (text) => {
        cliOutput += text;
      },
    });

    assert.equal(result.ok, false);
    assert.ok(result.issues.length >= 4, 'lint should report multiple schema-backed issues');
    assert.ok(result.issues.some((issue) => issue.ruleId === 'invalid-enum-attribute'));
    assert.ok(result.issues.some((issue) => issue.ruleId === 'missing-required-slot'));
    assert.ok(result.issues.some((issue) => issue.ruleId === 'a11y-contract' && issue.component === 'aihio-button'));
    assert.ok(result.issues.some((issue) => issue.ruleId === 'a11y-contract' && issue.component === 'aihio-tabs'));
    assert.ok(result.issues.every((issue) => typeof issue.location.line === 'number' && issue.location.line >= 1));
    assert.ok(result.issues.every((issue) => typeof issue.path === 'string' && issue.path.length > 0));

    assert.equal(cliStatus, 1);
    const cliResult = JSON.parse(cliOutput);
    assert.equal(cliResult.ok, false);
    assert.ok(Array.isArray(cliResult.issues) && cliResult.issues.length === result.issues.length);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('runtime bundle exposes Aihio.describe and schema-backed component versions', async () => {
  const previousAihio = globalThis.Aihio;

  try {
    const aihioUrl = `${pathToFileURL(resolve(root, 'dist/aihio.js')).href}?t=${Date.now()}`;
    const componentsUrl = `${pathToFileURL(resolve(root, 'dist/components.js')).href}?t=${Date.now()}`;

    const { Aihio, describe } = await import(aihioUrl);
    const componentModule = await import(componentsUrl);
    const { AihioButton, AihioDialog, AihioInput } = componentModule;

    assert.equal(globalThis.Aihio, Aihio, 'runtime bundle publishes Aihio globally');
    assert.equal(Aihio.describe, describe, 'named describe export matches the Aihio namespace');
    assert.equal(Aihio.describe('aihio-button')?.version, '1.3.0', 'button schema is introspectable by tag');
    assert.equal(Aihio.describe({ tagName: 'AIHIO-DIALOG' })?.$component, 'aihio-dialog', 'describe accepts live-element-like objects');
    assert.equal(AihioButton.schemaVersion, '1.3.0', 'button class carries schemaVersion');
    assert.equal(AihioDialog.schemaVersion, '1.1.0', 'dialog class carries schemaVersion');
    assert.equal(AihioInput.schemaVersion, '1.2.0', 'input class carries schemaVersion');
    for (const component of Object.values(componentModule)) {
      if (!component?.tag || !component.schemaVersion) continue;
      assert.equal(
        component.schemaVersion,
        Aihio.describe(component.tag)?.version,
        `${component.tag} class and schema versions stay in sync`
      );
    }
  } finally {
    globalThis.Aihio = previousAihio;
  }
});

test('package exports include generated declaration entrypoints', () => {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

  assert.equal(pkg.types, './dist/aihio.d.ts');
  assert.equal(pkg.exports['.'].types, './dist/aihio.d.ts');
  assert.equal(pkg.exports['./components'].types, './dist/components.d.ts');
  assert.equal(pkg.exports['./lint'].types, './dist/lint.d.ts');
  assert.equal(pkg.exports['./lint'].default, './dist/lint.js');
  assert.equal(pkg.exports['./prompt'].types, './dist/prompt.d.ts');
  assert.equal(pkg.exports['./prompt'].default, './dist/prompt.js');
  for (const component of ['alert', 'avatar', 'badge', 'button', 'card', 'cluster', 'combobox', 'dialog', 'dropdown', 'field', 'input', 'stack', 'tabs', 'toggle']) {
    assert.equal(pkg.exports[`./${component}`].types, `./dist/${component}.d.ts`);
    assert.equal(pkg.exports[`./${component}`].default, `./dist/${component}.js`);
  }
  assert.equal(pkg.exports['./runtime'].types, './dist/runtime.d.ts');
  assert.equal(pkg.exports['./runtime'].default, './dist/runtime.js');
  assert.ok(!pkg.sideEffects.includes('./dist/button.js'), 'granular component imports remain tree-shakeable');
  assert.match(pkg.bin['aihio-lint'], /^\.?\/?dist\/aihio-lint\.js$/);
  assert.match(pkg.bin['aihio-mcp'], /^\.?\/?dist\/aihio-mcp\.js$/);
});

test('granular component entrypoints do not pull the whole library into the bundle', () => {
  const button = readFileSync(resolve(root, 'dist/button.js'), 'utf8');

  assert.ok(Buffer.byteLength(button) < 15_000, 'button entry stays below its focused bundle budget');
  assert.doesNotMatch(button, /aihio-dialog|aihio-tabs|aihio-dropdown/);
});

test('schema output exposes intent vocabulary and every component carries required AI-first fields', () => {
  const schema = JSON.parse(readFileSync(resolve(root, 'dist/schema.json'), 'utf8'));

  assert.ok(schema.intents && typeof schema.intents === 'object', 'intent vocabulary is exported');
  const vocabulary = new Set(Object.keys(schema.intents));

  for (const component of schema.components) {
    assert.match(component.version, /^[0-9]+\.[0-9]+\.[0-9]+$/, `${component.$component} has semver version`);
    assert.ok(Array.isArray(component.intents) && component.intents.length > 0, `${component.$component} declares intents`);
    for (const intent of component.intents) {
      assert.ok(vocabulary.has(intent), `${component.$component}: intent "${intent}" is in vocabulary`);
    }
    assert.ok(component.a11yContract && Array.isArray(component.a11yContract.handled), `${component.$component} has a11yContract.handled`);
    for (const requirement of component.a11yContract?.required ?? []) {
      if (requirement.severity === 'error') {
        assert.ok(requirement.rule, `${component.$component}: error-level a11y requirements are machine-checkable`);
      }
    }
    assert.ok(Array.isArray(component.counterExamples), `${component.$component} has counterExamples`);
  }
});

test('schema content pass keeps a11y guidance and counterexamples populated for every component', () => {
  const schema = JSON.parse(readFileSync(resolve(root, 'dist/schema.json'), 'utf8'));

  for (const component of schema.components) {
    assert.ok(
      component.a11yContract?.handled?.length >= 1,
      `${component.$component} should document at least one handled a11y behavior`
    );
    assert.ok(
      component.a11yContract?.required?.length >= 1,
      `${component.$component} should document at least one author a11y obligation`
    );
    assert.ok(
      component.counterExamples?.length >= 2,
      `${component.$component} should include at least two counterexamples`
    );
  }
});

test('minified schema is emitted without prose and is well-formed JSON', () => {
  const minified = JSON.parse(readFileSync(resolve(root, 'dist/schema.min.json'), 'utf8'));

  assert.equal(minified.components.length, 14);
  assert.ok(Array.isArray(minified.intents), 'minified intents is a flat array of names');
  assert.equal(minified.patterns.length, 8);

  for (const component of minified.components) {
    assert.equal(component.description, undefined, `${component.$component} description stripped`);
    assert.equal(component.examples, undefined, `${component.$component} examples stripped`);
    for (const [name, attr] of Object.entries(component.attributes ?? {})) {
      assert.equal(attr.description, undefined, `${component.$component}.${name} description stripped`);
    }
  }

  for (const pattern of minified.patterns) {
    assert.equal(pattern.description, undefined, `${pattern.id} description stripped`);
    assert.ok(typeof pattern.markup === 'string' && pattern.markup.includes('aihio-'), `${pattern.id} markup preserved`);
    for (const variation of pattern.variations ?? []) {
      assert.equal(variation.description, undefined, `${pattern.id}/${variation.id} description stripped`);
    }
  }
});

test('meta-schema validator rejects malformed component schemas', async () => {
  const { validate } = await import(pathToFileURL(resolve(root, 'src/schema/validate.js')).href);
  const metaSchema = JSON.parse(readFileSync(resolve(root, 'src/schema/meta-schema.json'), 'utf8'));
  const valid = JSON.parse(readFileSync(resolve(root, 'src/components/button/button.schema.json'), 'utf8'));

  assert.deepEqual(validate(metaSchema, valid), [], 'button schema passes meta-schema');

  const missingVersion = { ...valid };
  delete missingVersion.version;
  const versionErrors = validate(metaSchema, missingVersion);
  assert.ok(versionErrors.some((e) => e.message.includes('version')), 'missing version is reported');

  const badIntent = { ...valid, intents: 123 };
  const intentErrors = validate(metaSchema, badIntent);
  assert.ok(intentErrors.some((e) => e.message.includes('array')), 'intents type mismatch is reported');

  const badVariant = {
    ...valid,
    attributes: { variant: { type: 'enum', description: 'x' } },
  };
  const variantErrors = validate(metaSchema, badVariant);
  assert.equal(variantErrors.length, 0, 'values array is advisory; cross-field check lives in build.js');
});

test('register skips already-defined tags safely', async () => {
  const originalCustomElements = globalThis.customElements;
  const defined = new Map([['aihio-button', class ExistingButton {}]]);

  globalThis.customElements = {
    define(tag, component) {
      defined.set(tag, component);
    },
    get(tag) {
      return defined.get(tag);
    },
  };

  try {
    const registryUrl = `${pathToFileURL(resolve(root, 'src/registry.js')).href}?t=${Date.now()}`;
    const { register } = await import(registryUrl);

    class DuplicateButton {
      static tag = 'aihio-button';
    }

    class NewButton {
      static tag = 'aihio-new-button';
    }

    assert.equal(register(DuplicateButton), false);
    assert.equal(register(NewButton), true);
    assert.equal(defined.get('aihio-new-button'), NewButton);
  } finally {
    globalThis.customElements = originalCustomElements;
  }
});

test('production bundle drops dev warnings and the dev bundle keeps them', () => {
  const prod = readFileSync(resolve(root, 'dist/aihio.js'), 'utf8');
  const dev = readFileSync(resolve(root, 'dist/aihio.dev.js'), 'utf8');

  // The whole reason two bundles exist: warnings must be eliminated from the
  // shipped default entry, not merely switched off behind a flag consumers
  // cannot reach.
  assert.doesNotMatch(prod, /requiresExplicitAccessibleName|hasAssociatedLabel/);
  assert.doesNotMatch(prod, /\[aihio\] /);

  assert.match(dev, /requiresExplicitAccessibleName/);
  assert.match(dev, /hasAssociatedLabel/);
  assert.match(dev, /\[aihio\] /);
});

test('dev warnings install through a hook rather than a compile-time flag', async () => {
  const hook = await import(
    pathToFileURL(resolve(root, 'src/components/dev-hook.js')).href
  );
  const devWarnings = await import(
    pathToFileURL(resolve(root, 'src/schema/dev-warnings.js')).href
  );

  // Nothing is installed by importing components — the production entry gets
  // an inert hook, and enabling warnings is an explicit act.
  assert.equal(hook.hasDevHook(), false);

  devWarnings.installDevWarnings();
  assert.equal(hook.hasDevHook(), true);

  devWarnings.installDevWarnings();
  assert.equal(hook.hasDevHook(), true, 'install should be idempotent');

  devWarnings.uninstallDevWarnings();
  assert.equal(hook.hasDevHook(), false);
});

test('package exposes the dev bundle as its own entrypoint', () => {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

  assert.equal(pkg.exports['./dev'].default, './dist/aihio.dev.js');
  assert.equal(pkg.exports['./components/dev'].default, './dist/components.dev.js');
});

test('palette meets its contrast contract in both themes', async () => {
  const { checkTheme } = await import(
    pathToFileURL(resolve(root, 'src/tokens/contrast.js')).href
  );
  const base = JSON.parse(readFileSync(resolve(root, 'tokens/base.json'), 'utf8'));
  const semantic = JSON.parse(readFileSync(resolve(root, 'tokens/semantic.json'), 'utf8'));

  const resolveValue = (value) => {
    const match = String(value).match(/^\{color\.([a-z]+)\.([0-9]+)\}$/);
    return match ? base.color[match[1]][match[2]].$value : value;
  };

  for (const theme of ['light', 'dark']) {
    const colors = Object.fromEntries(
      Object.entries(semantic[theme])
        .filter(([, token]) => token?.$type === 'color')
        .map(([name, token]) => [name, resolveValue(token.$value)])
    );

    for (const result of checkTheme(theme, colors)) {
      assert.ok(result.pass, `${theme}/${result.id}: ${result.message} — ${result.note}`);
    }
  }
});

test('every keyframe animation is switched off under reduced motion', async () => {
  const { readdirSync } = await import('node:fs');
  const componentsDir = resolve(root, 'src/components');
  const unguarded = [];

  for (const dir of readdirSync(componentsDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;

    const file = resolve(componentsDir, dir.name, `${dir.name}.js`);
    let source;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const animations = [...source.matchAll(/animation:\s*([\w-]+)\s/g)]
      .map((match) => match[1])
      .filter((name) => name !== 'none');

    if (animations.length === 0) continue;

    // Transition timings collapse via the duration tokens, but a keyframe
    // animation has to be stopped where it is declared -- a looping one would
    // otherwise become a strobe at 1ms.
    if (!source.includes('prefers-reduced-motion')) {
      unguarded.push(`${dir.name} (${animations.join(', ')})`);
    }
  }

  assert.deepEqual(unguarded, [], 'components animate without a reduced-motion guard');
});

test('reduced motion collapses transition timings but not the spinner', () => {
  const css = readFileSync(resolve(root, 'src/css/tokens.css'), 'utf8');
  const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));

  assert.match(block, /--duration-intent-feedback:\s*1ms;/);
  assert.match(block, /--duration-intent-overlay:\s*1ms;/);
  assert.doesNotMatch(
    block,
    /--duration-intent-spinner:/,
    'a 1ms infinite rotation is a strobe; the spinner is stopped at its declaration instead'
  );
});

test('components that convey state through colour handle forced colours', () => {
  const css = readFileSync(resolve(root, 'dist/aihio.css'), 'utf8');
  const bundle = readFileSync(resolve(root, 'dist/aihio.js'), 'utf8');
  const all = `${css}\n${bundle}`;

  // Forced colours discard background-color, so anything whose state reads
  // only as a fill needs an explicit system-colour treatment.
  for (const keyword of ['ButtonText', 'ButtonBorder', 'CanvasText', 'FieldText', 'GrayText', 'Highlight']) {
    assert.ok(all.includes(keyword), `${keyword} is used in a forced-colors block`);
  }

  assert.ok(
    css.match(/forced-colors/g).length >= 8,
    'light DOM components carry forced-colors handling'
  );
  assert.ok(
    bundle.match(/forced-colors/g).length >= 2,
    'shadow DOM components (dialog, dropdown) carry forced-colors handling'
  );
});

test('light-DOM component styles ship in aihio.css and not a second time in the JavaScript', () => {
  const css = readFileSync(resolve(root, 'dist/aihio.css'), 'utf8');
  const bundle = readFileSync(resolve(root, 'dist/aihio.js'), 'utf8');
  const dialogEntry = readFileSync(resolve(root, 'dist/dialog.js'), 'utf8');

  assert.ok(css.includes('aihio-alert[variant=destructive]') || css.includes('aihio-alert[variant="destructive"]'));
  assert.ok(!bundle.includes('aihio-alert[variant="destructive"]'), 'alert CSS stays out of the bundle');
  assert.ok(!bundle.includes('aihio-button:not(:defined)'), 'button CSS stays out of the bundle');
  // Shadow components adopt their styles at runtime, so those stay.
  assert.ok(dialogEntry.includes('::backdrop'), 'the dialog keeps its shadow styles');
});

test('every custom event is namespaced and declared in the schema', () => {
  const schema = JSON.parse(readFileSync(resolve(root, 'dist/schema.json'), 'utf8'));

  const declared = new Set();
  const walk = (entry) => {
    for (const name of Object.keys(entry.events ?? {})) declared.add(name);
    for (const related of entry.related ?? []) walk(related);
  };
  for (const component of schema.components) walk(component);

  // `click` is the native event, documented on aihio-button rather than
  // dispatched by it; everything the components emit themselves is prefixed so
  // it cannot be confused with a native close/toggle/select/input further up
  // the tree, where these bubbling composed events all land.
  for (const name of declared) {
    if (name === 'click') continue;
    assert.match(name, /^aihio-/, `declared event ${name} is namespaced`);
  }

  const sources = readFileSync(resolve(root, 'dist/components.js'), 'utf8');
  const emitted = [...sources.matchAll(/emit\("([^"]+)"/g)].map((match) => match[1]);
  assert.ok(emitted.length >= 7, 'the built bundle still carries emit call sites');

  for (const name of emitted) {
    assert.match(name, /^aihio-/, `emitted event ${name} is namespaced`);
    assert.ok(declared.has(name), `emitted event ${name} is declared in a schema`);
  }
});
