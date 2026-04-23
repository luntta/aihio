import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const schemaPath = resolve(root, 'dist/schema.json');
const packagePath = resolve(root, 'package.json');
const intentTokensPath = resolve(root, 'docs/intent-tokens.md');

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

function toPreviewMarkup(tag, markup) {
  const normalizedMarkup = String(markup ?? '');
  if (tag === 'aihio-dialog' && normalizedMarkup.startsWith('<aihio-dialog') && !normalizedMarkup.includes('<aihio-dialog open')) {
    return normalizedMarkup.replace('<aihio-dialog', '<aihio-dialog open');
  }

  if (tag === 'aihio-dropdown' && normalizedMarkup.startsWith('<aihio-dropdown') && !normalizedMarkup.includes('<aihio-dropdown open')) {
    return normalizedMarkup.replace('<aihio-dropdown', '<aihio-dropdown open');
  }

  return normalizedMarkup;
}

if (!existsSync(schemaPath)) {
  throw new Error('Missing dist/schema.json. Run `npm run build` before building the docs site.');
}

const schema = readJson(schemaPath);
const pkg = readJson(packagePath);
const intentTokensMarkdown = readFileSync(intentTokensPath, 'utf8');

const rawPatterns = schema.patterns.map((pattern) => ({
  ...pattern,
  path: `/patterns/${pattern.id}/`,
  intentsDetailed: (pattern.intents ?? []).map((intent) => ({
    name: intent,
    description: schema.intents[intent] ?? '',
  })),
  previewMarkup: pattern.markup,
  variationEntries: (pattern.variations ?? []).map((variation, index) => ({
    ...variation,
    id: `${pattern.id}-variation-${index + 1}`,
    title: variation.name,
    previewMarkup: variation.markup,
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
      attributeEntries: Object.entries(component.attributes ?? {}).map(([attribute, definition]) => ({
        name: attribute,
        ...definition,
      })),
      slotEntries: Object.entries(component.slots ?? {}).map(([slot, definition]) => ({
        name: slot,
        ...definition,
      })),
      eventEntries: Object.entries(component.events ?? {}).map(([event, definition]) => ({
        name: event,
        ...definition,
      })),
      relatedEntries: (component.related ?? []).map((related) => ({
        tag: related.$component,
        slug: tagToSlug(related.$component),
        name: toTitleCase(tagToSlug(related.$component)),
        path: `/components/${tagToSlug(related.$component)}/`,
      })),
      intentsDetailed: (component.intents ?? []).map((intent) => ({
        name: intent,
        description: schema.intents[intent] ?? '',
      })),
      examplesDetailed: (component.examples ?? []).map((markup, index) => ({
        id: `${slug}-example-${index + 1}`,
        markup,
        previewMarkup: toPreviewMarkup(tag, markup),
        title: `Example ${index + 1}`,
      })),
      counterExamplesDetailed: (component.counterExamples ?? []).map((example, index) => ({
        id: `${slug}-counter-example-${index + 1}`,
        ...example,
        previewMarkup: toPreviewMarkup(tag, example.markup),
        title: `Counterexample ${index + 1}`,
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
  featuredComponents: components.slice(0, 6),
  patterns,
  featuredPatterns: patterns.slice(0, 4),
  intents: Object.entries(schema.intents ?? {}).map(([name, description]) => ({
    name,
    description,
  })),
  intentTokensMarkdown,
};
