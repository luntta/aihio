export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ dist: 'dist' });
  eleventyConfig.addPassthroughCopy({ 'site/assets': 'assets' });
  eleventyConfig.addWatchTarget('./dist/**/*');
  eleventyConfig.addWatchTarget('./site/assets/**/*');
  eleventyConfig.addWatchTarget('./package.json');
  eleventyConfig.addWatchTarget('./docs/intent-tokens.md');

  eleventyConfig.addFilter('componentUrl', (component) => {
    const tag = typeof component === 'string' ? component : component?.tag ?? component?.$component;
    if (!tag) return '/components/';
    return `/components/${String(tag).replace(/^aihio-/, '')}/`;
  });

  eleventyConfig.addFilter('startsWith', (value, prefix) => String(value ?? '').startsWith(String(prefix ?? '')));

  return {
    dir: {
      input: 'site',
      includes: '_includes',
      data: '_data',
      output: '_site',
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    templateFormats: ['md', 'njk', '11ty.js'],
  };
}
