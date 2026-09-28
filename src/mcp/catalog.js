// What an agent needs before it can describe or lint anything: which
// components and patterns exist, and which of them fit the thing it was asked
// to build. The minified runtime schema drops every description to stay small,
// so the catalogue reads the full one; both are emitted by src/schema/build.js
// before this module is bundled into dist/aihio-mcp.js.

import schemaDocument from '../../dist/schema.json' with { type: 'json' };
import authoringPrompt from '../../dist/prompt.js';

export { authoringPrompt };

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'i', 'in', 'into', 'is', 'it', 'me', 'my',
  'need', 'of', 'on', 'or', 'show', 'so', 'some', 'that', 'the', 'their', 'them', 'this', 'to',
  'use', 'user', 'users', 'want', 'with', 'you', 'your',
]);

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
 * Rank components and patterns against a request. An exact intent name
 * ("destructive-action") selects everything declaring it; free text ("confirm
 * before deleting a project") is matched word by word against names, intents,
 * the intents' own definitions, and descriptions.
 */
export function find(query) {
  const text = String(query ?? '').trim().toLowerCase();
  const intentDefinitions = schemaDocument.intents;

  if (Object.hasOwn(intentDefinitions, text)) {
    return {
      query: text,
      intent: { name: text, description: intentDefinitions[text] },
      components: listComponents().filter((component) => component.intents.includes(text)),
      patterns: listPatterns().filter((pattern) => pattern.intents.includes(text)),
    };
  }

  const terms = [...new Set(tokenize(text))];
  const score = ({ names, relatedNames = [], intents, description }) => {
    const nameWords = new Set(names.flatMap(tokenize));
    const relatedWords = new Set(relatedNames.flatMap(tokenize));
    const intentWords = new Set(intents.flatMap(tokenize));
    const definitionWords = new Set(intents.flatMap((intent) => tokenize(intentDefinitions[intent] ?? '')));
    const descriptionWords = new Set(tokenize(description ?? ''));
    return terms.reduce(
      (total, term) =>
        total +
        (nameWords.has(term) ? 4 : 0) +
        (relatedWords.has(term) ? 1 : 0) +
        (intentWords.has(term) ? 3 : 0) +
        (definitionWords.has(term) ? 1 : 0) +
        (descriptionWords.has(term) ? 2 : 0),
      0
    );
  };
  const rank = (entries, describe) =>
    entries
      .map((entry) => ({ ...entry, score: score(describe(entry)) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_RESULTS);

  return {
    query: text,
    components: rank(listComponents(), (component) => ({
      names: [component.tag.replace(/^aihio-/, '')],
      relatedNames: component.related.map((tag) => tag.replace(/^aihio-/, '')),
      intents: component.intents,
      description: component.description,
    })),
    patterns: rank(listPatterns(), (pattern) => ({
      names: [pattern.id, pattern.name],
      intents: pattern.intents,
      description: pattern.description,
    })),
  };
}

/* Words reduced to a rough stem, so "deleting", "delete", and "deletion"
   meet, as do "confirm" and "confirmation". */
function tokenize(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .map(stem);
}

function stem(word) {
  const stemmed = word.replace(/(ations?|ions?|ing|ed|es|s|e)$/, '');
  return stemmed.length >= 3 ? stemmed : word;
}
