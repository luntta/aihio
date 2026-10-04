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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/*
 * Schema prose is written for agents as much as people, so it quotes markup
 * inline: "Renders a real <button>; variant="default" is the primary style".
 * Printed as plain text, a tag reads as a typo. This escapes the text and sets
 * each quoted element, tag, attribute, and aihio-* name in <code>.
 */
const PROSE_CODE = new RegExp(
  [
    // <a href="/x">Text</a>, but not the "<a href> inside" of a sentence: a
    // literal element's attributes all have values.
    String.raw`<([a-z][a-z0-9-]*)(?:\s+[a-z][a-z0-9-]*="[^"]*")*\s*>[^<>]*(?:<[^<>]+>[^<>]*)*?<\/\1>`,
    String.raw`<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?>`, // <button>, <a href>
    String.raw`\b[a-z][a-z0-9-]*\*?="[^"]*"`, // variant="default"
    String.raw`(?<![\w-])aihio-[a-z][a-z0-9-]*\b`, // aihio-field, aihio-before-close
    String.raw`(?<![\w-])--[a-z][a-z0-9-]*\b`, // --open, --aihio-color-page-bg
  ].join('|'),
  'g'
);

function prose(text) {
  const source = String(text ?? '');
  let html = '';
  let last = 0;
  for (const match of source.matchAll(PROSE_CODE)) {
    html += escapeHtml(source.slice(last, match.index));
    html += `<code>${escapeHtml(match[0])}</code>`;
    last = match.index + match[0].length;
  }
  return html + escapeHtml(source.slice(last));
}

/*
 * A small HTML highlighter for the markup samples. Monochrome, like the rest
 * of the site: structure reads from weight and tone, not from colour.
 */
function highlightHtml(source) {
  const pattern = /(<!--[\s\S]*?-->)|(<\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?>)/g;
  let html = '';
  let last = 0;
  for (const match of String(source ?? '').matchAll(pattern)) {
    html += escapeHtml(source.slice(last, match.index));
    if (match[1]) {
      html += `<span class="hl-comment">${escapeHtml(match[1])}</span>`;
    } else {
      const attributes = match[4].replace(/(\s+)([^\s=]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+))?/g, (_, space, name, equals, value) =>
        `${space}<span class="hl-attr">${escapeHtml(name)}</span>${equals ? `${escapeHtml(equals)}<span class="hl-value">${escapeHtml(value)}</span>` : ''}`
      );
      html += `<span class="hl-punct">${escapeHtml(match[2])}</span><span class="hl-tag">${escapeHtml(match[3])}</span>${attributes}<span class="hl-punct">${escapeHtml(match[5])}</span>`;
    }
    last = match.index + match[0].length;
  }
  return html + escapeHtml(String(source ?? '').slice(last));
}

export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ dist: 'dist' });
  eleventyConfig.addPassthroughCopy({ 'site/assets': 'assets' });
  eleventyConfig.addWatchTarget('./dist/**/*');
  eleventyConfig.addWatchTarget('./site/assets/**/*');
  eleventyConfig.addWatchTarget('./package.json');
  eleventyConfig.addWatchTarget('./docs/tokens.json');

  eleventyConfig.addFilter('componentUrl', (component) => {
    const tag = typeof component === 'string' ? component : component?.tag ?? component?.$component;
    if (!tag) return '/components/';
    return `/components/${String(tag).replace(/^aihio-/, '')}/`;
  });

  eleventyConfig.addFilter('docsUrl', (target, fromUrl = '/') => toDocsUrl(target, fromUrl));
  eleventyConfig.addFilter('startsWith', (value, prefix) => String(value ?? '').startsWith(String(prefix ?? '')));
  eleventyConfig.addFilter('prose', prose);
  eleventyConfig.addFilter('highlightHtml', highlightHtml);
  eleventyConfig.addFilter('lineCount', (value) => String(value ?? '').split('\n').length);

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
