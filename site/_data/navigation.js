import docs from './docs.js';

/**
 * The sidebar is the single source of navigation truth: every page in the site
 * appears in exactly one group here. The top bar deliberately carries no links
 * of its own, so there is nothing to keep in sync between the two.
 *
 * `url` is always absolute; templates run it through the `docsUrl` filter to
 * get a relative href, because the built site has to work from a file path or
 * a subdirectory, not just a domain root.
 */
const sections = [
  {
    title: 'Start here',
    items: [
      { title: 'Overview', url: '/' },
      { title: 'AI & tooling', url: '/ai/' },
    ],
  },
  {
    title: 'Foundations',
    items: [
      { title: 'Semantic tokens', url: '/foundations/tokens/' },
    ],
  },
  {
    title: 'Components',
    url: '/components/',
    count: docs.componentCount,
    items: docs.components.map((component) => ({
      title: component.name,
      url: component.path,
    })),
  },
  {
    title: 'Patterns',
    url: '/patterns/',
    count: docs.patternCount,
    items: docs.patterns.map((pattern) => ({
      title: pattern.name,
      url: pattern.path,
    })),
  },
];

export default { sections };
