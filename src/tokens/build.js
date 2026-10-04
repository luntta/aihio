import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRAST_REQUIREMENTS, checkTheme } from './contrast.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

const base = readJson('tokens/base.json');
const component = readJson('tokens/component.json');
const semantic = readJson('tokens/semantic.json');
const packageVersion = readJson('package.json').version;

// Every custom property Aihio defines is --aihio-<group>-<name>: prefixed, so
// it cannot collide with a host app's --primary or Tailwind's --color-red-600,
// and lowercase-hyphenated, so it is written the same way everywhere it is read
// and never needs escaping. The build refuses any other shape.
const NAME_PATTERN = /^--aihio-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TIERS = [
  ['primitive', base],
  ['component', component],
  ['semantic', semantic.shared],
];

// References ({spacing.4}) resolve against primitives, component tokens, and
// the shared semantic tokens. Themed colours are only ever read from CSS.
const tokenRoot = {};
for (const [, tier] of TIERS) mergeTier(tokenRoot, tier);

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function isToken(node) {
  return Boolean(node) && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, '$value');
}

function mergeTier(target, source, path = []) {
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith('$')) continue;
    if (key.includes('.')) {
      throw new Error(`Token key ${JSON.stringify([...path, key].join('.'))} contains a dot; write half steps with a hyphen (1-5).`);
    }
    if (isToken(value)) {
      if (target[key] !== undefined) throw new Error(`Token ${[...path, key].join('.')} is defined twice`);
      target[key] = value;
      continue;
    }
    target[key] ??= {};
    mergeTier(target[key], value, [...path, key]);
  }
}

function lookup(path) {
  let node = tokenRoot;
  for (const key of path.split('.')) {
    node = node?.[key];
  }
  return isToken(node) ? node : null;
}

function toVarName(path) {
  const name = `--aihio-${path.replace(/\./g, '-')}`;
  if (!NAME_PATTERN.test(name)) throw new Error(`Token ${path} would compile to ${name}, which is not --aihio-<lowercase-kebab>`);
  return name;
}

/** Replace {path} references with var(--aihio-…), checking each one resolves. */
function toCssValue(value, trail = []) {
  return String(value).replace(/\{([^}]+)\}/g, (_, path) => {
    if (trail.includes(path)) throw new Error(`Circular token reference: ${[...trail, path].join(' -> ')}`);
    const target = lookup(path);
    if (!target) throw new Error(`Unresolved token reference: ${path}`);
    toCssValue(target.$value, [...trail, path]);
    return `var(${toVarName(path)})`;
  });
}

/** Follow references down to a literal value, for docs and the contrast check. */
function resolveValue(value, trail = []) {
  return String(value).replace(/\{([^}]+)\}/g, (_, path) => {
    if (trail.includes(path)) throw new Error(`Circular token reference: ${[...trail, path].join(' -> ')}`);
    return resolveValue(lookup(path).$value, [...trail, path]);
  });
}

/** Source references of a value, as CSS variable names. */
function referencesOf(value) {
  return [...String(value).matchAll(/\{([^}]+)\}/g)].map(([, path]) => toVarName(path));
}

function listTokens(node, path = []) {
  const tokens = [];
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$') || !value || typeof value !== 'object') continue;
    const next = [...path, key];
    if (isToken(value)) {
      tokens.push({
        path: next.join('.'),
        group: next[0],
        name: toVarName(next.join('.')),
        type: value.$type,
        raw: value.$value,
        css: toCssValue(value.$value),
        description: value.$description ?? '',
      });
    } else {
      tokens.push(...listTokens(value, next));
    }
  }
  return tokens;
}

const primitiveTokens = listTokens(base);
const componentTokens = listTokens(component);
const sharedSemanticTokens = listTokens(semantic.shared);
const lightTokens = listTokens(semantic.light);
const darkTokens = listTokens(semantic.dark);

const lightNames = lightTokens.map((token) => token.name).sort().join();
if (lightNames !== darkTokens.map((token) => token.name).sort().join()) {
  throw new Error('semantic.json: light and dark must define the same tokens');
}

function declarations(tokens, indent = '  ') {
  return tokens.map((token) => `${indent}${token.name}: ${token.css};`).join('\n');
}

// Transition and entrance timings collapse under reduced motion. The spinner
// is excluded: it drives a looping animation — see the media block below.
const reducedMotionTokens = sharedSemanticTokens
  .filter((token) => token.group === 'duration' && token.path !== 'duration.spinner')
  .map((token) => ({ ...token, css: '1ms' }));

const css = `/* Generated by src/tokens/build.js — do not edit */

:root {
  color-scheme: light;

  /* Primitives */
${declarations(primitiveTokens)}

  /* Component tokens */
${declarations(componentTokens)}

  /* Semantic */
${declarations(sharedSemanticTokens)}

  /* Semantic colour (light) */
${declarations(lightTokens)}
}

/* Any element can switch theme for its subtree. color-scheme follows, so the
   native controls Aihio leaves to the platform (select, textarea, checkboxes,
   scrollbars) are drawn for the same theme as everything around them. */
[data-theme="dark"] {
  color-scheme: dark;

  /* Semantic colour (dark) */
${declarations(darkTokens)}
}

[data-theme="light"] {
  color-scheme: light;

  /* Semantic colour (light) */
${declarations(lightTokens)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;

    /* Semantic colour (dark) — auto */
${declarations(darkTokens, '    ')}
  }
}

/* Every component transition and entrance animation is timed from these
   tokens, so collapsing them here removes the motion system-wide without a
   global !important override that would also flatten consumer animation.
   --aihio-duration-spinner is deliberately left alone: it drives a looping
   animation, and a 1ms infinite rotation is a strobe. Looping animations are
   switched off at their own declaration instead. */
@media (prefers-reduced-motion: reduce) {
  :root {
${declarations(reducedMotionTokens, '    ')}
  }
}
`;

// Contrast contract -----------------------------------------------------------

function resolvedTheme(tokens) {
  return Object.fromEntries(
    tokens.map((token) => [token.path.replace(/^color\./, ''), resolveValue(token.raw)])
  );
}

const themes = { light: resolvedTheme(lightTokens), dark: resolvedTheme(darkTokens) };
const contrastResults = [
  ...checkTheme('light', themes.light),
  ...checkTheme('dark', themes.dark),
];
const contrastFailures = contrastResults.filter((result) => !result.pass);

if (contrastFailures.length > 0) {
  console.error('token build failed — palette does not meet its contrast contract:');
  for (const failure of contrastFailures) {
    console.error(`  ${failure.theme}/${failure.id}: ${failure.message} — ${failure.note}`);
  }
  process.exit(1);
}

// Machine-readable reference --------------------------------------------------

const GROUP_INTROS = {
  color: 'Themed colours, named for what they colour. Each has a light and a dark value.',
  spacing: 'Gaps and padding, named for the rhythm they set rather than a step on the scale.',
  radius: 'Corner rounding for surfaces and controls.',
  'font-family': 'Typefaces for interface text and fixed-width data.',
  'font-size': 'Text sizes for body copy, controls, and surface titles.',
  'font-weight': 'Weights for body text, controls, and headings.',
  'letter-spacing': 'Optical tracking, tightening as type grows.',
  'line-height': 'Line heights for readable copy and compact labels.',
  shadow: 'Elevation for surfaces and overlays.',
  duration: 'Motion timing for feedback and overlay entrance. Collapsed to 1ms under reduced motion, except the spinner.',
};

function describeToken(token, tier) {
  return {
    name: token.name,
    tier,
    group: token.group,
    type: token.type,
    value: resolveValue(token.raw),
    references: referencesOf(token.raw),
    ...(token.description ? { description: token.description } : {}),
  };
}

const darkByName = new Map(darkTokens.map((token) => [token.name, token]));
const semanticReference = [
  ...sharedSemanticTokens.map((token) => describeToken(token, 'semantic')),
  ...lightTokens.map((token) => {
    const dark = darkByName.get(token.name);
    return {
      name: token.name,
      tier: 'semantic',
      group: token.group,
      type: token.type,
      value: { light: resolveValue(token.raw), dark: resolveValue(dark.raw) },
      references: { light: referencesOf(token.raw), dark: referencesOf(dark.raw) },
      ...(token.description ? { description: token.description } : {}),
    };
  }),
].sort((left, right) => left.name.localeCompare(right.name));

const reference = {
  $schema: 'aihio-tokens',
  version: packageVersion,
  groups: GROUP_INTROS,
  tokens: [
    ...semanticReference,
    ...componentTokens.map((token) => describeToken(token, 'component')),
    ...primitiveTokens.map((token) => describeToken(token, 'primitive')),
  ],
  contrast: CONTRAST_REQUIREMENTS.map((requirement) => {
    const ratio = (theme) => contrastResults.find((result) => result.id === requirement.id && result.theme === theme).ratio;
    return {
      id: requirement.id,
      foreground: toVarName(`color.${requirement.foreground}`),
      background: toVarName(`color.${requirement.background}`),
      min: requirement.min,
      note: requirement.note,
      ratio: { light: round(ratio('light')), dark: round(ratio('dark')) },
    };
  }),
};

function round(value) {
  return Math.round(value * 100) / 100;
}

// Markdown vocabulary, for agents reading the package -------------------------

function formatSource(token) {
  if (!Array.isArray(token.references)) {
    return `light: ${formatList(token.references.light, token.value.light)}; dark: ${formatList(token.references.dark, token.value.dark)}`;
  }
  return formatList(token.references, token.value);
}

function formatList(references, value) {
  return references.length > 0 ? references.map((name) => `\`${name}\``).join(', ') : `\`${value}\``;
}

function buildMarkdown() {
  const lines = [
    '# Aihio Semantic Tokens',
    '',
    'Generated from `tokens/semantic.json` by `src/tokens/build.js`. The same data, with resolved values for both themes, is in `tokens.json`.',
    '',
    'Semantic tokens name what a value is for: `--aihio-color-surface-bg`, `--aihio-spacing-stack-md`. Components read only these and their own component tokens; the primitive scales beneath them are wiring. Write them exactly as listed: every name is `--aihio-<group>-<name>`, lowercase and hyphenated.',
    '',
    '- Colours are themed. Each has a light and a dark value, switched by `prefers-color-scheme` or `data-theme` on any element.',
    '- Colours are full values: `color: var(--aihio-color-page-fg)`. For transparency, mix: `color-mix(in oklch, var(--aihio-color-page-fg) 40%, transparent)`.',
    '',
  ];

  for (const [group, intro] of Object.entries(GROUP_INTROS)) {
    const rows = semanticReference.filter((token) => token.group === group);
    if (rows.length === 0) continue;

    lines.push(`## ${group}`, '', intro, '', '| CSS variable | Source | Description |', '| --- | --- | --- |');
    for (const token of rows) {
      lines.push(`| \`${token.name}\` | ${formatSource(token)} | ${token.description ?? ''} |`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

for (const token of reference.tokens) {
  if (!NAME_PATTERN.test(token.name)) throw new Error(`Invalid token name ${token.name}`);
}

const outPath = resolve(__dirname, '../css/tokens.css');
writeFileSync(outPath, css, 'utf8');
writeFileSync(resolve(root, 'docs/semantic-tokens.md'), buildMarkdown(), 'utf8');
writeFileSync(resolve(root, 'docs/tokens.json'), `${JSON.stringify(reference, null, 2)}\n`, 'utf8');
console.log(`tokens → ${outPath}`);
console.log('tokens → docs/semantic-tokens.md, docs/tokens.json');
console.log(`contrast → ${contrastResults.length} pairs pass (light + dark)`);
