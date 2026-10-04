import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { pathToFileURL } from 'node:url';

import { defaultTreeAdapter, parseFragment, serialize } from 'parse5';

import showcase from './showcase.js';

const root = resolve(import.meta.dirname, '..', '..');
const schemaPath = resolve(root, 'dist/schema.json');
const packagePath = resolve(root, 'package.json');
const tokensPath = resolve(root, 'dist/tokens.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function toTitleCase(value) {
  return String(value ?? '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tagToSlug(tag) {
  return String(tag ?? '').replace(/^aihio-/, '');
}

/**
 * A preview never opens a dialog. aihio-dialog opens with showModal(), which
 * lifts the panel into the top layer, above the page and out of reach of any
 * containment, and makes everything else inert: a snippet rendered open locked
 * the whole docs page on load. So `open` is dropped, and a dialog that arrives
 * without a trigger of its own gets one (commandfor + command="--open") for the
 * reader to open, the way the examples that carry a trigger already work.
 * Nested dialogs are left to their outer one.
 */
function toPreviewMarkup(markup, previewId) {
  const source = String(markup ?? '');
  if (!/<aihio-dialog\b/.test(source)) return source;

  const fragment = parseFragment(source);
  const invoked = new Set(
    findElements(fragment, (node) => getAttr(node, 'commandfor') !== null).map((node) => getAttr(node, 'commandfor'))
  );

  findElements(fragment, (node) => node.tagName === 'aihio-dialog').forEach((dialog, index) => {
    dialog.attrs = dialog.attrs.filter(({ name }) => name !== 'open');
    if (hasAncestor(dialog, 'aihio-dialog')) return;

    let id = getAttr(dialog, 'id');
    if (id === null) {
      id = `${previewId}-dialog-${index + 1}`;
      dialog.attrs.push({ name: 'id', value: id });
    }
    if (invoked.has(id)) return;

    const [trigger] = parseFragment(
      `<aihio-button variant="outline" commandfor="${id}" command="--open">Open dialog</aihio-button>`
    ).childNodes;
    defaultTreeAdapter.insertBefore(dialog.parentNode, trigger, dialog);
  });

  return serialize(fragment);
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

function hasAncestor(node, tagName) {
  for (let current = node.parentNode; current; current = current.parentNode) {
    if (current.tagName === tagName) return true;
  }
  return false;
}

/** Every value of each attribute that changes how a component looks, drawn by the showcase. */
function toVariantGroups(component, spec = {}) {
  return Object.entries(spec.variants ?? {})
    .map(([attribute, render]) => ({
      attribute,
      description: component.attributes?.[attribute]?.description ?? '',
      layout: spec.layout ?? 'row',
      cells: (component.attributes?.[attribute]?.values ?? []).map((value) => ({ value, markup: render(value) })),
    }))
    .filter((group) => group.cells.length > 0);
}

/** Attributes, properties, methods, events, slots, and commands, as lists for the reference. */
function toApiEntries(definition, tag) {
  return {
    attributeEntries: Object.entries(definition.attributes ?? {}).map(([name, attribute]) => ({
      name,
      ...attribute,
      hasDefault: attribute.default !== undefined,
      defaultLabel: attribute.default === undefined ? '' : String(attribute.default),
    })),
    propertyEntries: Object.entries(definition.properties ?? {}).map(([name, property]) => ({ name, ...property })),
    methodEntries: Object.entries(definition.methods ?? {}).map(([name, method]) => ({
      signature: `${name.replace(/\(\)$/, '')}(${(method.parameters ?? [])
        .map((parameter) => `${parameter.name}${parameter.optional ? '?' : ''}: ${parameter.type}`)
        .join(', ')})${method.returns ? `: ${method.returns}` : ''}`,
      description: method.description,
    })),
    eventEntries: Object.entries(definition.events ?? {}).map(([name, event]) => ({
      name,
      source: tag,
      ...event,
      detailEntries: Object.entries(event.detail ?? {}).map(([key, type]) => ({ key, type })),
    })),
    slotEntries: Object.entries(definition.slots ?? {}).map(([name, slot]) => ({ name, ...slot })),
    commandEntries: Object.entries(definition.commands ?? {}).map(([name, command]) => ({ name, ...command })),
  };
}

const COMPOSITION_LABELS = {
  requiredSlots: 'Required slots',
  allowedSlots: 'Allowed slots',
  requiredChildren: 'Required children',
  allowedChildren: 'Allowed children',
  forbiddenChildren: 'Forbidden descendants',
  allowedParents: 'Allowed parents',
  requiredAncestors: 'Required ancestors',
};

const COMPOSITION_TOKENS = {
  '*': 'anything',
  '#text': 'text',
  '#flow': 'other HTML',
  '#root': 'not inside another component',
};

function toCompositionEntries(composition = {}) {
  return Object.entries(COMPOSITION_LABELS)
    .filter(([key]) => Array.isArray(composition[key]))
    .map(([key, label]) => ({
      label,
      values: composition[key].length === 0
        ? [{ text: 'none' }]
        : composition[key].map((value) => COMPOSITION_TOKENS[value]
          ? { text: COMPOSITION_TOKENS[value] }
          : { code: value, url: tagUrls.get(value) ?? null }),
    }));
}

/** A token's source, as the CSS variables it reads (per theme for colours). */
function formatTokenSource(token) {
  const list = (references, value) => (references.length > 0 ? references.join(', ') : value);
  if (Array.isArray(token.references)) return list(token.references, token.value);
  return `light: ${list(token.references.light, token.value.light)} · dark: ${list(token.references.dark, token.value.dark)}`;
}

if (!existsSync(schemaPath)) {
  throw new Error('Missing dist/schema.json. Run `npm run build` before building the docs site.');
}

const schema = readJson(schemaPath);
const pkg = readJson(packagePath);
const tokens = readJson(tokensPath);
// The linter the package ships, run over each counterexample at build time,
// so the docs print exactly what an agent running aihio-lint would get.
const { lintMarkup } = await import(pathToFileURL(resolve(root, 'dist/lint.js')).href);

/** A reason's first sentence as a heading, the rest as its explanation. */
function splitReason(reason) {
  const [lead, ...rest] = String(reason).split(/(?<=\.)\s+(?=[A-Z<])/);
  return { lead, rest: rest.join(' ') };
}

// Where each tag is documented: a component's own page, or a sub-component's
// section on its parent's page.
const tagUrls = new Map();
for (const component of schema.components) {
  const url = `/components/${tagToSlug(component.$component)}/`;
  tagUrls.set(component.$component, url);
  for (const related of component.related ?? []) tagUrls.set(related.$component, `${url}#${related.$component}`);
}

const semanticTokenGroups = Object.entries(tokens.groups)
  .map(([name, intro]) => ({
    name,
    intro,
    tokens: tokens.tokens
      .filter((token) => token.tier === 'semantic' && token.group === name)
      .map((token) => ({
        variable: token.name,
        source: formatTokenSource(token),
        description: token.description ?? '',
      })),
  }))
  .filter((group) => group.tokens.length > 0);

const rawPatterns = schema.patterns.map((pattern) => ({
  ...pattern,
  path: `/patterns/${pattern.id}/`,
  intentsDetailed: (pattern.intents ?? []).map((intent) => ({
    name: intent,
    description: schema.intents[intent] ?? '',
  })),
  previewMarkup: toPreviewMarkup(pattern.markup, pattern.id),
  variationEntries: (pattern.variations ?? []).map((variation, index) => ({
    ...variation,
    id: `${pattern.id}-variation-${index + 1}`,
    title: variation.name,
    previewMarkup: toPreviewMarkup(variation.markup, `${pattern.id}-variation-${index + 1}`),
  })),
}));

const patternsByComponent = new Map();
for (const pattern of rawPatterns) {
  for (const componentTag of pattern.requiredComponents ?? []) {
    const entries = patternsByComponent.get(componentTag) ?? [];
    entries.push({
      id: pattern.id,
      name: pattern.name,
      path: pattern.path,
    });
    patternsByComponent.set(componentTag, entries);
  }
}

const components = schema.components
  .map((component) => {
    const tag = component.$component;
    const slug = tagToSlug(tag);
    const name = toTitleCase(slug);

    return {
      ...component,
      tag,
      slug,
      name,
      path: `/components/${slug}/`,
      ...toApiEntries(component, tag),
      variantGroups: toVariantGroups(component, showcase[tag]),
      thumbnail: showcase[tag]?.thumbnail ?? null,
      compositionEntries: toCompositionEntries(component.composition),
      // Sub-components (aihio-card-header, aihio-tab, aihio-option) are only
      // ever used inside their parent, so they are documented on its page,
      // each under an anchor named for its tag.
      subComponents: (component.related ?? []).map((related) => ({
        tag: related.$component,
        anchor: related.$component,
        description: related.description,
        ...toApiEntries(related, related.$component),
      })),
      intentsDetailed: (component.intents ?? []).map((intent) => ({
        name: intent,
        description: schema.intents[intent] ?? '',
      })),
      examplesDetailed: (component.examples ?? []).map((example, index) => ({
        id: `${slug}-example-${index + 1}`,
        title: example.title,
        description: example.description ?? null,
        markup: example.markup,
        previewMarkup: toPreviewMarkup(example.markup, `${slug}-example-${index + 1}`),
      })),
      counterExamplesDetailed: (component.counterExamples ?? []).map((example, index) => ({
        id: `${slug}-mistake-${index + 1}`,
        ...example,
        ...splitReason(example.reason),
        fixPreviewMarkup: toPreviewMarkup(example.fix, `${slug}-mistake-${index + 1}-fix`),
        issues: lintMarkup(example.markup).issues.map((issue) => ({
          rule: issue.contract ?? issue.ruleId,
          severity: issue.severity,
          message: issue.message,
          suggestion: issue.suggestion ?? null,
        })),
      })),
      handledA11y: component.a11yContract?.handled ?? [],
      requiredA11y: component.a11yContract?.required ?? [],
      patternsUsing: patternsByComponent.get(tag) ?? [],
    };
  })
  .sort((left, right) => left.name.localeCompare(right.name));

const patterns = rawPatterns
  .map((pattern) => ({
    ...pattern,
    componentEntries: (pattern.requiredComponents ?? []).map((tag) => ({
      tag,
      slug: tagToSlug(tag),
      name: toTitleCase(tagToSlug(tag)),
      path: `/components/${tagToSlug(tag)}/`,
    })),
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export default {
  packageName: pkg.name,
  packageVersion: pkg.version,
  schemaVersion: schema.version,
  componentCount: components.length,
  patternCount: patterns.length,
  intentCount: Object.keys(schema.intents ?? {}).length,
  components,
  // The components that show the most of what the system does: forms that
  // submit, a filtering field, overlays opened from markup, and tabs.
  featuredComponents: ['aihio-button', 'aihio-field', 'aihio-combobox', 'aihio-dialog', 'aihio-dropdown', 'aihio-tabs']
    .map((tag) => components.find((component) => component.tag === tag)),
  patterns,
  featuredPatterns: patterns.slice(0, 4),
  // The intent vocabulary with what declares each intent: the map an agent
  // reads from the prompt, as a page.
  intents: Object.entries(schema.intents ?? {}).map(([name, description]) => ({
    name,
    description,
    components: components
      .filter((component) => (component.intents ?? []).includes(name))
      .map(({ tag, name: title, path }) => ({ tag, name: title, path })),
    patterns: patterns
      .filter((pattern) => (pattern.intents ?? []).includes(name))
      .map(({ id, name: title, path }) => ({ id, name: title, path })),
  })),
  tokens,
  semanticTokenGroups,
  semanticTokenCount: semanticTokenGroups.reduce((count, group) => count + group.tokens.length, 0),
};
