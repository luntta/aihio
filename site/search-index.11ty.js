/**
 * The docs search index: the catalogue the find ranking reads (the same one
 * the MCP server ranks against, minus markup), plus pages, sub-components,
 * and semantic tokens for name lookups. URLs are site-absolute; the search
 * script resolves them against the site root, wherever that is mounted.
 */
export default class SearchIndex {
  data() {
    return {
      permalink: '/search-index.json',
      eleventyExcludeFromCollections: true,
    };
  }

  render({ docs, navigation }) {
    const pages = navigation.sections
      .flatMap((section) => section.items.filter(() => !['Components', 'Patterns'].includes(section.title)))
      .map(({ title, url }) => ({ title, url }));
    const subComponents = docs.components.flatMap((component) =>
      component.subComponents.map((sub) => ({ title: `<${sub.tag}>`, url: `${component.path}#${sub.anchor}` }))
    );

    return JSON.stringify({
      intents: Object.fromEntries(docs.intents.map(({ name, description }) => [name, description])),
      components: docs.components.map((component) => ({
        tag: component.tag,
        name: component.name,
        url: component.path,
        description: component.description,
        intents: component.intents,
        related: component.subComponents.map((sub) => sub.tag),
      })),
      patterns: docs.patterns.map((pattern) => ({
        id: pattern.id,
        name: pattern.name,
        url: pattern.path,
        description: pattern.description,
        intents: pattern.intents,
      })),
      pages: [...pages, ...subComponents],
      tokens: docs.tokens.tokens
        .filter((token) => token.tier === 'semantic')
        .map((token) => ({ name: token.name, url: `/foundations/tokens/#${token.name.slice(2)}` })),
    });
  }
}
