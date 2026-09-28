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

/**
 * A dialog snippet with no trigger would preview as an empty box, so one that
 * starts at <aihio-dialog> is opened for display. Examples that carry their
 * own trigger (commandfor + command="--open") start at the button and are
 * left closed, like a dropdown, for the reader to open — the live component
 * demonstrates itself better than a frozen open state.
 */
function toPreviewMarkup(tag, markup) {
  const normalizedMarkup = String(markup ?? '');
  if (tag === 'aihio-dialog' && normalizedMarkup.startsWith('<aihio-dialog') && !normalizedMarkup.includes('<aihio-dialog open')) {
    return normalizedMarkup.replace('<aihio-dialog', '<aihio-dialog open');
  }

  return normalizedMarkup;
}

/**
 * The generated intent-token reference is a markdown document of pipe tables.
 * Rendering it as preformatted text put a four-column table inside a <pre>,
 * which is the single least responsive thing a page can contain. Parsing it
 * back into rows lets the page render real tables that reflow and scroll.
 */
function parseIntentTokenGroups(markdown) {
  const groups = [];
  let group = null;

  for (const line of markdown.split('\n')) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      group = { name: heading[1].trim(), intro: '', tokens: [] };
      groups.push(group);
      continue;
    }

    if (!group) continue;

    const cells = line.trim().startsWith('|')
      ? line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
      : null;

    if (!cells) {
      const text = line.trim();
      if (text && !group.intro) group.intro = text;
      continue;
    }

    // Skip the header row and the |---|---| separator beneath it.
    if (cells[0] === 'Token' || cells.every((cell) => /^-+$/.test(cell))) continue;

    const [token, variable, source, description] = cells;
    group.tokens.push({
      token: token.replace(/`/g, ''),
      variable: variable.replace(/`/g, ''),
      source: source.replace(/`/g, ''),
      description,
    });
  }

  return groups.filter((entry) => entry.tokens.length > 0);
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
      eventEntries: [
        ...Object.entries(component.events ?? {}).map(([event, definition]) => ({
          name: event,
          source: tag,
          ...definition,
        })),
        // Sub-components like aihio-dropdown-item and aihio-tab dispatch their
        // own events but have no page of their own, so their events would go
        // undocumented if they were not folded into the parent's list.
        ...(component.related ?? []).flatMap((related) =>
          Object.entries(related.events ?? {}).map(([event, definition]) => ({
            name: event,
            source: related.$component,
            ...definition,
          }))
        ),
      ],
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
  intentTokenGroups: parseIntentTokenGroups(intentTokensMarkdown),
};
