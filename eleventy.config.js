import { posix as path } from 'node:path';

function normalizeUrl(url) {
  if (url == null || url === '') {
    return '/';
  }

  const normalized = String(url).startsWith('/') ? String(url) : `/${url}`;
  return normalized;
}

function toDocsUrl(target, fromUrl = '/') {
  const normalizedTarget = normalizeUrl(target);
  const normalizedFrom = normalizeUrl(fromUrl);
  const relative = path.relative(normalizedFrom, normalizedTarget) || '.';

  if (normalizedTarget.endsWith('/')) {
    return relative === '.' ? './' : `${relative}/`;
  }

  return relative;
}

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

  eleventyConfig.addFilter('docsUrl', (target, fromUrl = '/') => toDocsUrl(target, fromUrl));
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
