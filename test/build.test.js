import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
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
  assert.equal(components.length, 10);
  assert.equal(components[0], 'aihio-alert');
  assert.equal(components.at(-1), 'aihio-toggle');
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

test('runtime bundle exposes Aihio.describe and schema-backed component versions', async () => {
  const previousAihio = globalThis.Aihio;

  try {
    const aihioUrl = `${pathToFileURL(resolve(root, 'dist/aihio.js')).href}?t=${Date.now()}`;
    const componentsUrl = `${pathToFileURL(resolve(root, 'dist/components.js')).href}?t=${Date.now()}`;

    const { Aihio, describe } = await import(aihioUrl);
    const { AihioButton, AihioDialog, AihioInput } = await import(componentsUrl);

    assert.equal(globalThis.Aihio, Aihio, 'runtime bundle publishes Aihio globally');
    assert.equal(Aihio.describe, describe, 'named describe export matches the Aihio namespace');
    assert.equal(Aihio.describe('aihio-button')?.version, '1.0.0', 'button schema is introspectable by tag');
    assert.equal(Aihio.describe({ tagName: 'AIHIO-DIALOG' })?.$component, 'aihio-dialog', 'describe accepts live-element-like objects');
    assert.equal(AihioButton.schemaVersion, '1.0.0', 'button class carries schemaVersion');
    assert.equal(AihioDialog.schemaVersion, '1.0.0', 'dialog class carries schemaVersion');
    assert.equal(AihioInput.schemaVersion, '1.0.0', 'input class carries schemaVersion');
  } finally {
    globalThis.Aihio = previousAihio;
  }
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
    assert.ok(Array.isArray(component.counterExamples), `${component.$component} has counterExamples`);
  }
});

test('minified schema is emitted without prose and is well-formed JSON', () => {
  const minified = JSON.parse(readFileSync(resolve(root, 'dist/schema.min.json'), 'utf8'));

  assert.equal(minified.components.length, 10);
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
