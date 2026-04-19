import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaDir = __dirname;
const componentsDir = resolve(__dirname, '../components');
const patternsDir = resolve(__dirname, '../../patterns');
const distDir = resolve(__dirname, '../../dist');
const outPath = resolve(distDir, 'schema.json');
const minPath = resolve(distDir, 'schema.min.json');
const runtimePath = resolve(schemaDir, 'runtime-schema.js');

const metaSchema = JSON.parse(readFileSync(resolve(schemaDir, 'meta-schema.json'), 'utf8'));
const intentVocabulary = JSON.parse(readFileSync(resolve(schemaDir, 'intents.json'), 'utf8'));
const validIntents = new Set(Object.keys(intentVocabulary.intents));

const schemas = [];
const seen = new Set();
const errors = [];

for (const dir of readdirSync(componentsDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;

  const schemaPath = resolve(componentsDir, dir.name, `${dir.name}.schema.json`);
  if (!existsSync(schemaPath)) continue;

  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const expectedComponent = `aihio-${dir.name}`;

  if (schema.$component !== expectedComponent) {
    errors.push(`${schemaPath}: must declare $component "${expectedComponent}"`);
    continue;
  }

  if (seen.has(schema.$component)) {
    errors.push(`${schemaPath}: duplicate schema for ${schema.$component}`);
    continue;
  }

  const schemaErrors = validate(metaSchema, schema);
  for (const err of schemaErrors) {
    errors.push(`${schemaPath}${err.path}: ${err.message}`);
  }

  if (Array.isArray(schema.intents)) {
    for (const intent of schema.intents) {
      if (!validIntents.has(intent)) {
        errors.push(
          `${schemaPath}/intents: unknown intent ${JSON.stringify(intent)} (add it to src/schema/intents.json if intentional)`
        );
      }
    }
  }

  if (schema.attributes) {
    for (const [name, attr] of Object.entries(schema.attributes)) {
      if (attr.type === 'enum' && !Array.isArray(attr.values)) {
        errors.push(`${schemaPath}/attributes/${name}: enum attribute requires "values" array`);
      }
    }
  }

  seen.add(schema.$component);
  schemas.push(schema);
}

if (errors.length > 0) {
  console.error('schema build failed:');
  for (const err of errors) console.error(`  ${err}`);
  process.exit(1);
}

const sorted = schemas.sort((left, right) => left.$component.localeCompare(right.$component));
const schemaByComponent = new Map(sorted.map((schema) => [schema.$component, schema]));
const { patterns, errors: patternErrors } = loadPatterns({
  patternsDir,
  validIntents,
  schemaByComponent,
});

if (patternErrors.length > 0) {
  console.error('schema build failed:');
  for (const err of patternErrors) console.error(`  ${err}`);
  process.exit(1);
}

const packageVersion = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf8')
).version;

const merged = {
  $schema: 'aihio-design-system',
  version: packageVersion,
  intents: intentVocabulary.intents,
  components: sorted,
  patterns,
};

mkdirSync(distDir, { recursive: true });
const stripped = stripForAgents(merged);
writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
writeFileSync(minPath, JSON.stringify(stripped), 'utf8');
writeFileSync(runtimePath, toRuntimeModule(stripped), 'utf8');
console.log(`schema → ${outPath} (${schemas.length} components, ${patterns.length} patterns)`);
console.log(`schema → ${minPath} (agent-minified)`);
console.log(`schema runtime → ${runtimePath}`);

// Drop human-facing prose (descriptions, examples, intent definitions) so the
// agent-minified build stays compact. Structural fields that drive markup
// generation (intents as tags, composition, a11yContract, counterExamples)
// are preserved.
function stripForAgents(doc) {
  return {
    $schema: doc.$schema,
    version: doc.version,
    intents: Object.keys(doc.intents),
    components: doc.components.map(stripComponent),
    patterns: doc.patterns.map(stripPattern),
  };
}

function stripComponent(component) {
  const stripped = {
    $component: component.$component,
    version: component.version,
    intents: component.intents,
  };
  if (component.attributes) stripped.attributes = mapEntries(component.attributes, stripAttribute);
  if (component.slots) stripped.slots = mapEntries(component.slots, ({ accepts }) => ({ ...(accepts ? { accepts } : {}) }));
  if (component.events) stripped.events = mapEntries(component.events, ({ detail }) => ({ ...(detail ? { detail } : {}) }));
  if (component.methods) stripped.methods = mapEntries(component.methods, () => ({}));
  if (component.properties) stripped.properties = mapEntries(component.properties, ({ type }) => ({ type }));
  if (component.composition) stripped.composition = component.composition;
  if (component.a11yContract) stripped.a11yContract = component.a11yContract;
  if (component.counterExamples) {
    stripped.counterExamples = component.counterExamples.map(({ markup }) => ({ markup }));
  }
  if (component.related) {
    stripped.related = component.related.map((rel) => ({ $component: rel.$component }));
  }
  return stripped;
}

function stripAttribute(attr) {
  const out = { type: attr.type };
  if (attr.values) out.values = attr.values;
  if (attr.default !== undefined) out.default = attr.default;
  return out;
}

function stripPattern(pattern) {
  const stripped = {
    id: pattern.id,
    name: pattern.name,
    intents: pattern.intents,
    requiredComponents: pattern.requiredComponents,
    markup: pattern.markup,
  };

  if (pattern.variations?.length > 0) {
    stripped.variations = pattern.variations.map(({ id, name, markup }) => ({ id, name, markup }));
  } else {
    stripped.variations = [];
  }

  return stripped;
}

function mapEntries(object, fn) {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    out[key] = fn(value);
  }
  return out;
}

function loadPatterns({ patternsDir, validIntents, schemaByComponent }) {
  const patterns = [];
  const errors = [];
  const seen = new Set();

  if (!existsSync(patternsDir)) {
    errors.push(`${patternsDir}: missing patterns directory`);
    return { patterns, errors };
  }

  for (const dir of readdirSync(patternsDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;

    const patternDir = resolve(patternsDir, dir.name);
    const patternPath = resolve(patternDir, 'pattern.json');
    const markupPath = resolve(patternDir, 'markup.html');

    if (!existsSync(patternPath)) {
      errors.push(`${patternDir}: missing pattern.json`);
      continue;
    }

    if (!existsSync(markupPath)) {
      errors.push(`${patternDir}: missing markup.html`);
      continue;
    }

    let meta;
    try {
      meta = JSON.parse(readFileSync(patternPath, 'utf8'));
    } catch (error) {
      errors.push(`${patternPath}: invalid JSON (${error.message})`);
      continue;
    }

    validatePatternMeta(meta, { dirName: dir.name, patternPath, validIntents, schemaByComponent, errors });

    const markup = readText(markupPath, errors).trim();
    if (!markup) {
      errors.push(`${markupPath}: markup.html must not be empty`);
    }

    const variations = loadPatternVariations({
      meta,
      patternDir,
      errors,
      validIntents,
      schemaByComponent,
    });

    validatePatternMarkup(markup, markupPath, {
      requiredComponents: meta.requiredComponents,
      validIntents,
      schemaByComponent,
      errors,
    });

    if (typeof meta.id === 'string') {
      if (seen.has(meta.id)) {
        errors.push(`${patternPath}: duplicate pattern id ${JSON.stringify(meta.id)}`);
      } else {
        seen.add(meta.id);
      }
    }

    patterns.push({
      id: meta.id,
      name: meta.name,
      intents: meta.intents,
      description: meta.description,
      requiredComponents: meta.requiredComponents,
      markup,
      variations,
    });
  }

  return {
    patterns: patterns.sort((left, right) => String(left.id).localeCompare(String(right.id))),
    errors,
  };
}

function validatePatternMeta(meta, { dirName, patternPath, validIntents, schemaByComponent, errors }) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    errors.push(`${patternPath}: pattern.json must be an object`);
    return;
  }

  if (meta.id !== dirName) {
    errors.push(`${patternPath}: id must match directory name "${dirName}"`);
  }

  if (!isNonEmptyString(meta.name)) {
    errors.push(`${patternPath}: name must be a non-empty string`);
  }

  if (!isNonEmptyString(meta.description)) {
    errors.push(`${patternPath}: description must be a non-empty string`);
  }

  if (!Array.isArray(meta.intents) || meta.intents.length === 0) {
    errors.push(`${patternPath}: intents must be a non-empty array`);
  } else {
    const seenIntents = new Set();
    for (const intent of meta.intents) {
      if (!isNonEmptyString(intent)) {
        errors.push(`${patternPath}: intents must only contain non-empty strings`);
        continue;
      }

      if (!validIntents.has(intent)) {
        errors.push(`${patternPath}: unknown pattern intent ${JSON.stringify(intent)}`);
      }

      if (seenIntents.has(intent)) {
        errors.push(`${patternPath}: duplicate pattern intent ${JSON.stringify(intent)}`);
      } else {
        seenIntents.add(intent);
      }
    }
  }

  if (!Array.isArray(meta.requiredComponents) || meta.requiredComponents.length === 0) {
    errors.push(`${patternPath}: requiredComponents must be a non-empty array`);
  } else {
    const seenComponents = new Set();
    for (const component of meta.requiredComponents) {
      if (!isNonEmptyString(component)) {
        errors.push(`${patternPath}: requiredComponents must only contain non-empty strings`);
        continue;
      }

      if (!schemaByComponent.has(component)) {
        errors.push(`${patternPath}: requiredComponents entry ${JSON.stringify(component)} does not exist in component schema`);
      }

      if (seenComponents.has(component)) {
        errors.push(`${patternPath}: duplicate requiredComponents entry ${JSON.stringify(component)}`);
      } else {
        seenComponents.add(component);
      }
    }
  }

  if (!Array.isArray(meta.variations)) {
    errors.push(`${patternPath}: variations must be an array`);
  }
}

function loadPatternVariations({ meta, patternDir, errors, validIntents, schemaByComponent }) {
  const variationsDir = resolve(patternDir, 'variations');
  const declared = Array.isArray(meta.variations) ? meta.variations : [];
  const seen = new Set();
  const loaded = [];

  for (const variation of declared) {
    if (!variation || typeof variation !== 'object' || Array.isArray(variation)) {
      errors.push(`${resolve(patternDir, 'pattern.json')}: variations entries must be objects`);
      continue;
    }

    const { id, name, description } = variation;
    if (!isNonEmptyString(id)) {
      errors.push(`${resolve(patternDir, 'pattern.json')}: every variation requires a non-empty id`);
      continue;
    }

    if (seen.has(id)) {
      errors.push(`${resolve(patternDir, 'pattern.json')}: duplicate variation id ${JSON.stringify(id)}`);
      continue;
    }
    seen.add(id);

    if (!isNonEmptyString(name)) {
      errors.push(`${resolve(patternDir, 'pattern.json')}: variation ${JSON.stringify(id)} requires a non-empty name`);
    }

    if (!isNonEmptyString(description)) {
      errors.push(`${resolve(patternDir, 'pattern.json')}: variation ${JSON.stringify(id)} requires a non-empty description`);
    }

    const variationPath = resolve(variationsDir, `${id}.html`);
    if (!existsSync(variationPath)) {
      errors.push(`${variationPath}: missing variation markup for ${JSON.stringify(id)}`);
      continue;
    }

    const markup = readText(variationPath, errors).trim();
    if (!markup) {
      errors.push(`${variationPath}: variation markup must not be empty`);
      continue;
    }

    validatePatternMarkup(markup, variationPath, {
      requiredComponents: meta.requiredComponents,
      validIntents,
      schemaByComponent,
      errors,
    });

    loaded.push({ id, name, description, markup });
  }

  if (existsSync(variationsDir)) {
    for (const entry of readdirSync(variationsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
      const variationId = entry.name.slice(0, -'.html'.length);
      if (!seen.has(variationId)) {
        errors.push(`${resolve(variationsDir, entry.name)}: variation file is not declared in pattern.json`);
      }
    }
  }

  return loaded.sort((left, right) => left.id.localeCompare(right.id));
}

function validatePatternMarkup(markup, sourcePath, { requiredComponents, validIntents, schemaByComponent, errors }) {
  for (const component of requiredComponents ?? []) {
    if (!markupIncludesComponent(markup, component)) {
      errors.push(`${sourcePath}: required component ${JSON.stringify(component)} is not used in the pattern markup`);
    }
  }

  for (const annotation of collectIntentAnnotations(markup)) {
    for (const intent of annotation.intents) {
      if (!validIntents.has(intent)) {
        errors.push(`${sourcePath}: ${annotation.tag} references unknown data-aihio-intent ${JSON.stringify(intent)}`);
        continue;
      }

      const component = schemaByComponent.get(annotation.tag);
      if (component && !component.intents.includes(intent)) {
        errors.push(
          `${sourcePath}: ${annotation.tag} cannot be annotated with ${JSON.stringify(intent)} because its schema declares ${JSON.stringify(component.intents)}`
        );
      }
    }
  }
}

function collectIntentAnnotations(markup) {
  const annotations = [];
  const tagPattern = /<(aihio-[a-z0-9-]+)\b([^>]*)>/gi;

  for (const match of markup.matchAll(tagPattern)) {
    const tag = match[1];
    const attrs = match[2] ?? '';
    const intentMatch = attrs.match(/\bdata-aihio-intent\s*=\s*(['"])(.*?)\1/i);
    if (!intentMatch) continue;

    const intents = intentMatch[2]
      .split(/\s+/)
      .map((intent) => intent.trim())
      .filter(Boolean);

    annotations.push({ tag, intents });
  }

  return annotations;
}

function markupIncludesComponent(markup, component) {
  return new RegExp(`<${escapeRegex(component)}\\b`, 'i').test(markup);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function readText(path, errors) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    errors.push(`${path}: ${error.message}`);
    return '';
  }
}

function toRuntimeModule(doc) {
  return `/* Generated by src/schema/build.js — do not edit */\n\nconst runtimeSchema = ${JSON.stringify(doc)};\n\nexport default runtimeSchema;\nexport { runtimeSchema };\n`;
}
