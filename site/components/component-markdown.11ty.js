/** Each component page as markdown, at /components/<name>/index.md. */
export default class ComponentMarkdown {
  data() {
    return {
      pagination: { data: 'docs.components', size: 1, alias: 'component' },
      permalink: ({ component }) => `/components/${component.slug}/index.md`,
      eleventyExcludeFromCollections: true,
    };
  }

  render({ component }) {
    return component.markdown;
  }
}
