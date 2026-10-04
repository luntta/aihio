// The ranking behind the MCP server's find tool and the docs site's search,
// kept apart from both so each feeds it its own catalogue: the server the full
// schema, the docs a compact index.
//
// An exact intent name ("destructive-action") selects everything declaring it.
// Free text ("confirm before deleting a project") is matched word by word
// against names, intents, the intents' own definitions, and descriptions.

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'i', 'in', 'into', 'is', 'it', 'me', 'my',
  'need', 'of', 'on', 'or', 'show', 'so', 'some', 'that', 'the', 'their', 'them', 'this', 'to',
  'use', 'user', 'users', 'want', 'with', 'you', 'your',
]);

/**
 * @param {string} query
 * @param {object} catalogue
 * @param {Record<string, string>} catalogue.intents - intent name -> definition
 * @param {{ tag: string, description: string, intents: string[], related?: string[] }[]} catalogue.components
 * @param {{ id: string, name: string, description: string, intents: string[] }[]} catalogue.patterns
 * @param {{ limit?: number }} [options]
 */
export function rankCatalogue(query, { intents, components, patterns }, { limit = 5 } = {}) {
  const text = String(query ?? '').trim().toLowerCase();

  if (Object.hasOwn(intents, text)) {
    return {
      query: text,
      intent: { name: text, description: intents[text] },
      components: components.filter((component) => component.intents.includes(text)),
      patterns: patterns.filter((pattern) => pattern.intents.includes(text)),
    };
  }

  const terms = [...new Set(tokenize(text))];
  const score = ({ names, relatedNames = [], intents: declared, description }) => {
    const nameWords = new Set(names.flatMap(tokenize));
    const relatedWords = new Set(relatedNames.flatMap(tokenize));
    const intentWords = new Set(declared.flatMap(tokenize));
    const definitionWords = new Set(declared.flatMap((intent) => tokenize(intents[intent] ?? '')));
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
      .slice(0, limit);

  return {
    query: text,
    components: rank(components, (component) => ({
      names: [component.tag.replace(/^aihio-/, '')],
      relatedNames: (component.related ?? []).map((tag) => tag.replace(/^aihio-/, '')),
      intents: component.intents,
      description: component.description,
    })),
    patterns: rank(patterns, (pattern) => ({
      names: [pattern.id, pattern.name],
      intents: pattern.intents,
      description: pattern.description,
    })),
  };
}

/* Words reduced to a rough stem, so "deleting", "delete", and "deletion"
   meet, as do "confirm" and "confirmation". */
export function tokenize(text) {
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
