// What an agent needs before it can describe or lint anything: which
// components and patterns exist, and which of them fit the thing it was asked
// to build. The minified runtime schema drops every description to stay small,
// so the catalogue reads the full one; both are emitted by src/schema/build.js
// before this module is bundled into dist/aihio-mcp.js.

import schemaDocument from '../../dist/schema.json' with { type: 'json' };
import authoringPrompt from '../../dist/prompt.js';
import { rankCatalogue } from '../schema/find.js';

export { authoringPrompt };

const MAX_RESULTS = 5;

export function listComponents() {
  return schemaDocument.components.map((component) => ({
    tag: component.$component,
    description: component.description,
    intents: component.intents,
    ...(component.commands ? { commands: Object.keys(component.commands) } : {}),
    related: (component.related ?? []).map((related) => related.$component),
  }));
}

export function listPatterns() {
  return schemaDocument.patterns.map((pattern) => ({
    id: pattern.id,
    name: pattern.name,
    description: pattern.description,
    intents: pattern.intents,
    requiredComponents: pattern.requiredComponents,
    variations: (pattern.variations ?? []).map((variation) => variation.id),
  }));
}

export function getPattern(id) {
  const pattern = schemaDocument.patterns.find((candidate) => candidate.id === id);
  if (!pattern) return null;
  return {
    id: pattern.id,
    name: pattern.name,
    description: pattern.description,
    intents: pattern.intents,
    requiredComponents: pattern.requiredComponents,
    markup: pattern.markup,
    variations: (pattern.variations ?? []).map(({ id: variationId, name, description, markup }) => ({
      id: variationId,
      name,
      ...(description ? { description } : {}),
      markup,
    })),
  };
}

/**
 * Rank components and patterns against a request: an intent name, or free
 * text such as "confirm before deleting a project".
 */
export function find(query) {
  return rankCatalogue(
    query,
    { intents: schemaDocument.intents, components: listComponents(), patterns: listPatterns() },
    { limit: MAX_RESULTS }
  );
}
