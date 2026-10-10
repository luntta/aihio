import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

// Aihio's tokens are Design Tokens Format Module 2025.10 files
// (https://www.designtokens.org/tr/2025.10/format/) tied together by a
// resolver document (https://www.designtokens.org/tr/2025.10/resolver/). This
// reads the part of the format the tokens use and turns each token into the CSS
// it compiles to. Anything else in a token file is refused by name rather than
// skipped, so nothing a file says is silently lost.

/** The vendor key in $extensions that carries CSS the format cannot express. */
export const EXTENSION = 'io.github.luntta.aihio';

const VERSION = '2025.10';
const ALIAS = /^\{([^{}]+)\}$/;
const DTCG_TYPES = ['color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number', 'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography'];
const GROUP_PROPERTIES = ['$description', '$type'];
const TOKEN_PROPERTIES = ['$value', '$type', '$description', '$extensions'];
const FONT_WEIGHTS = {
  thin: 100, hairline: 100, 'extra-light': 200, 'ultra-light': 200, light: 300,
  normal: 400, regular: 400, book: 400, medium: 500, 'semi-bold': 600, 'demi-bold': 600,
  bold: 700, 'extra-bold': 800, 'ultra-bold': 800, black: 900, heavy: 900,
  'extra-black': 950, 'ultra-black': 950,
};
const SHADOW_PARTS = { offsetX: 'dimension', offsetY: 'dimension', blur: 'dimension', spread: 'dimension', color: 'color' };

function hasKeys(value, required, optional = []) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}

// The types the tokens use: the shape a $value takes, as an error shows it,
// a test for it, and the CSS it compiles to. `part` compiles a value nested in
// a composite, so a reference there is checked as one at the top level is.
const TYPES = {
  color: {
    // Aihio's colours are oklch, so any other space is refused, not converted.
    shape: '{ "colorSpace": "oklch", "components": [L, C, H], "alpha"?: 0–1 }',
    is: (value) => hasKeys(value, ['colorSpace', 'components'], ['alpha', 'hex'])
      && value.colorSpace === 'oklch'
      && Array.isArray(value.components) && value.components.length === 3
      && value.components.every((component) => component === 'none' || Number.isFinite(component))
      && (value.alpha === undefined || (Number.isFinite(value.alpha) && value.alpha >= 0 && value.alpha <= 1))
      && (value.hex === undefined || /^#[0-9a-f]{6}$/i.test(value.hex)),
    css: ({ components, alpha = 1 }) => `oklch(${components.join(' ')}${alpha === 1 ? '' : ` / ${alpha}`})`,
  },
  dimension: {
    shape: '{ "value": <number>, "unit": "px" | "rem" }',
    is: (value) => hasKeys(value, ['value', 'unit']) && Number.isFinite(value.value) && ['px', 'rem'].includes(value.unit),
    // The format wants a unit on zero too; CSS does not.
    css: ({ value, unit }) => (value === 0 ? '0' : `${value}${unit}`),
  },
  duration: {
    shape: '{ "value": <number>, "unit": "ms" | "s" }',
    is: (value) => hasKeys(value, ['value', 'unit']) && Number.isFinite(value.value) && ['ms', 's'].includes(value.unit),
    css: ({ value, unit }) => `${value}${unit}`,
  },
  number: {
    shape: 'a JSON number',
    is: (value) => Number.isFinite(value),
    css: (value) => String(value),
  },
  fontWeight: {
    shape: 'a number from 1 to 1000, or a weight name such as "semi-bold"',
    is: (value) => (Number.isFinite(value) && value >= 1 && value <= 1000) || Object.hasOwn(FONT_WEIGHTS, value),
    css: (value) => String(FONT_WEIGHTS[value] ?? value),
  },
  fontFamily: {
    shape: 'a font name, or an array of font names',
    is: (value) => [value].flat().length > 0
      && [value].flat().every((name) => typeof name === 'string' && /^[^{}]+$/.test(name)),
    // A name that is one CSS identifier (Arial, sans-serif, -apple-system) is
    // written bare, as a generic family has to be; any other name is quoted.
    css: (value) => [value].flat()
      .map((name) => (/^-?[A-Za-z_][\w-]*$/.test(name) ? name : `"${name.replace(/["\\]/g, '\\$&')}"`))
      .join(', '),
  },
  shadow: {
    shape: '{ "color", "offsetX", "offsetY", "blur", "spread", "inset"? }, or an array of them',
    is: (value) => [value].flat().length > 0 && [value].flat().every((layer) => (
      typeof layer === 'string'
        ? ALIAS.test(layer)
        : hasKeys(layer, Object.keys(SHADOW_PARTS), ['inset']) && [undefined, true, false].includes(layer.inset)
    )),
    css: (value, part) => [value].flat()
      .map((layer) => (typeof layer === 'string'
        ? part('shadow', layer)
        : [...(layer.inset ? ['inset'] : []), ...Object.entries(SHADOW_PARTS).map(([key, type]) => part(type, layer[key]))].join(' ')))
      .join(', '),
  },
};

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function checkTypeName(type, where) {
  if (Object.hasOwn(TYPES, type)) return;
  throw new Error(DTCG_TYPES.includes(type)
    ? `${where}: $type ${type} is a DTCG type the token build does not compile yet`
    : `${where}: $type ${JSON.stringify(type)} is not a DTCG type`);
}

/** Every token in one file, with the $type of the closest group that sets one. */
function readFile(file, label) {
  const tokens = [];
  const walk = (group, path, inheritedType) => {
    const where = `${label}: ${path.join('.') || 'the root group'}`;
    for (const key of Object.keys(group)) {
      if (key.startsWith('$') && !GROUP_PROPERTIES.includes(key)) throw new Error(`${where} has ${key}, which the token build does not read`);
    }
    if (group.$type !== undefined) checkTypeName(group.$type, where);
    const groupType = group.$type ?? inheritedType;

    for (const [key, node] of Object.entries(group)) {
      if (key.startsWith('$')) continue;
      const at = [...path, key].join('.');
      if (key.includes('.')) throw new Error(`${label}: ${at} contains a dot; write half steps with a hyphen (1-5)`);
      if (/[{}]/.test(key)) throw new Error(`${label}: ${at} contains a curly bracket, which a token name cannot`);
      if (!node || typeof node !== 'object' || Array.isArray(node)) throw new Error(`${label}: ${at} is neither a token nor a group`);
      if (Object.hasOwn(node, '$value')) tokens.push({ file: label, path: at, node, groupType });
      else walk(node, [...path, key], groupType);
    }
  };
  walk(readJson(file), [], undefined);
  return tokens;
}

/**
 * Read a resolver and the token files it names. Sets come back in resolution
 * order, and each modifier with the tokens of each of its contexts. A token is
 * { path, type, value, description? }, where value is the CSS it compiles to
 * with each reference left as {path}, for the caller to resolve.
 *
 * References resolve against the sets. A modifier's tokens can read the sets
 * but nothing can read them: a themed token is read from CSS, where the theme
 * picks its value, so a token built on one would freeze it at one theme.
 */
export function readTokens(resolverFile) {
  const label = basename(resolverFile);
  const document = readJson(resolverFile);
  if (document.version !== VERSION) throw new Error(`${label}: version must be "${VERSION}"`);

  const readSources = (sources) => sources.flatMap((source) => {
    if (typeof source?.$ref !== 'string' || source.$ref.startsWith('#')) {
      throw new Error(`${label}: every source must be { "$ref": "<token file>" }`);
    }
    return readFile(resolve(dirname(resolverFile), source.$ref), source.$ref);
  });

  const sets = new Map();
  const modifiers = new Map();
  for (const entry of document.resolutionOrder ?? []) {
    const [, kind, name] = /^#\/(sets|modifiers)\/([^/]+)$/.exec(entry?.$ref ?? '') ?? [];
    const definition = kind && document[kind]?.[name];
    if (!definition) throw new Error(`${label}: resolutionOrder entry ${JSON.stringify(entry)} names no set or modifier`);
    if (kind === 'sets') {
      sets.set(name, readSources(definition.sources));
    } else {
      modifiers.set(name, {
        default: definition.default,
        contexts: new Map(Object.entries(definition.contexts).map(([context, sources]) => [context, readSources(sources)])),
      });
    }
  }

  const shared = new Map();
  for (const token of [...sets.values()].flat()) {
    if (shared.has(token.path)) throw new Error(`${token.file}: ${token.path} is already defined in ${shared.get(token.path).file}`);
    shared.set(token.path, token);
  }
  const themed = new Set();
  for (const { contexts } of modifiers.values()) {
    for (const tokens of contexts.values()) {
      const seen = new Set();
      for (const token of tokens) {
        if (shared.has(token.path)) throw new Error(`${token.file}: ${token.path} is already defined in ${shared.get(token.path).file}`);
        if (seen.has(token.path)) throw new Error(`${token.file}: ${token.path} is defined twice in one context`);
        seen.add(token.path);
        themed.add(token.path);
      }
    }
  }

  const target = (path, from) => {
    if (shared.has(path)) return shared.get(path);
    throw new Error(themed.has(path)
      ? `${from.file}: ${from.path} references {${path}}, a themed token; those are read from CSS, so no token can reference one`
      : `${from.file}: ${from.path} references {${path}}, which is not defined`);
  };

  // The format's order: a token's own $type, else the type of the token it
  // references, else the closest group's $type.
  const typeOf = (token, trail = [token.path]) => {
    if (token.node.$type !== undefined) {
      checkTypeName(token.node.$type, `${token.file}: ${token.path}`);
      return token.node.$type;
    }
    const alias = typeof token.node.$value === 'string' && ALIAS.exec(token.node.$value);
    if (alias) {
      if (trail.includes(alias[1])) throw new Error(`Circular token reference: ${[...trail, alias[1]].join(' -> ')}`);
      return typeOf(target(alias[1], token), [...trail, alias[1]]);
    }
    if (token.groupType) return token.groupType;
    throw new Error(`${token.file}: ${token.path} has no $type, and no group above it sets one`);
  };

  const compile = (token) => {
    for (const key of Object.keys(token.node)) {
      if (!TOKEN_PROPERTIES.includes(key)) throw new Error(`${token.file}: ${token.path} has ${key}, which the token build does not read`);
    }
    const type = typeOf(token);
    const part = (expected, value) => {
      const alias = typeof value === 'string' && ALIAS.exec(value);
      if (alias) {
        const referenced = typeOf(target(alias[1], token));
        if (referenced !== expected) throw new Error(`${token.file}: ${token.path} references {${alias[1]}}, a ${referenced}, where a ${expected} belongs`);
        return `{${alias[1]}}`;
      }
      if (!TYPES[expected].is(value)) {
        throw new Error(`${token.file}: ${token.path} is not a valid ${expected}: ${JSON.stringify(value)}. Write ${TYPES[expected].shape}`);
      }
      return TYPES[expected].css(value, part);
    };
    let value = part(type, token.node.$value);

    // CSS the format cannot express: calc() over a reference, an em length,
    // min(). $value stays the nearest standard value, for other tools.
    const extension = token.node.$extensions?.[EXTENSION];
    if (extension !== undefined) {
      if (!hasKeys(extension, ['css']) || typeof extension.css !== 'string') {
        throw new Error(`${token.file}: ${token.path}: $extensions["${EXTENSION}"] must be { "css": "<value>" }`);
      }
      for (const [, path] of extension.css.matchAll(/\{([^{}]+)\}/g)) target(path, token);
      value = extension.css;
    }

    return { path: token.path, type, value, ...(token.node.$description ? { description: token.node.$description } : {}) };
  };

  return {
    sets: new Map([...sets].map(([name, tokens]) => [name, tokens.map(compile)])),
    modifiers: new Map([...modifiers].map(([name, { default: fallback, contexts }]) => [name, {
      default: fallback,
      contexts: new Map([...contexts].map(([context, tokens]) => [context, tokens.map(compile)])),
    }])),
  };
}
