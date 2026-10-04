/**
 * /llms.txt (https://llmstxt.org): where an agent should start. Links are
 * relative to this file, so they hold wherever the site is mounted.
 */
export default class Llms {
  data() {
    return { permalink: '/llms.txt', eleventyExcludeFromCollections: true };
  }

  render({ docs }) {
    const lines = [
      '# Aihio',
      '',
      '> An AI-first design system built on native web components, with no runtime dependencies. Every component has a machine-readable schema, and the same build emits a prompt fragment, a linter with fix suggestions, and an MCP server.',
      '',
      'Generate markup from the prompt fragment, start from a pattern where one fits, and run every snippet through aihio-lint (or the MCP server\'s lint tool) before returning it. An issue with a suggestion is fixed by applying the suggestion.',
      '',
      '## Start here',
      '',
      '- [Prompt fragment](dist/aihio.prompt.md): rules, every component, the intent map, patterns, accessibility obligations, and each mistake beside its fix. The one file to load.',
      '- [Intents](intents/): the intent vocabulary, and the components and patterns that declare each intent.',
      '- [AI and tooling](ai/): the MCP server, the linter, and the files below.',
      '',
      '## Components',
      '',
      ...docs.components.map((component) => `- [${component.name}](components/${component.slug}/index.md): ${component.description}`),
      '',
      '## Patterns',
      '',
      ...docs.patterns.map((pattern) => `- [${pattern.name}](patterns/${pattern.id}/): ${pattern.description}`),
      '',
      '## Optional',
      '',
      '- [Full schema](dist/schema.json): components, intents, patterns, examples, and counterexamples as JSON.',
      '- [Semantic tokens](dist/semantic-tokens.md): the custom properties to style with, and what each is for.',
      '- [Token values](dist/tokens.json): every token with resolved light and dark values.',
      '- [Everything as one file](llms-full.txt): the prompt fragment and every component page.',
    ];
    return `${lines.join('\n')}\n`;
  }
}
