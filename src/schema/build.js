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
const typesPath = resolve(distDir, 'aihio.d.ts');
const componentTypesPath = resolve(distDir, 'components.d.ts');
const promptTemplatePath = resolve(schemaDir, 'prompt-template.md');
const promptMarkdownPath = resolve(distDir, 'aihio.prompt.md');
const promptModulePath = resolve(distDir, 'prompt.js');
const promptTypesPath = resolve(distDir, 'prompt.d.ts');

const metaSchema = JSON.parse(readFileSync(resolve(schemaDir, 'meta-schema.json'), 'utf8'));
const intentVocabulary = JSON.parse(readFileSync(resolve(schemaDir, 'intents.json'), 'utf8'));
const intentTokens = JSON.parse(readFileSync(resolve(__dirname, '../../tokens/intent.json'), 'utf8'));
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
writeFileSync(typesPath, toTypeDeclarations(merged), 'utf8');
writeFileSync(componentTypesPath, toComponentTypeDeclarations(merged), 'utf8');
const promptMarkdown = toPromptMarkdown(merged);
writeFileSync(promptMarkdownPath, promptMarkdown, 'utf8');
writeFileSync(promptModulePath, toPromptModule(promptMarkdown), 'utf8');
writeFileSync(promptTypesPath, toStringModuleTypes(), 'utf8');
console.log(`schema → ${outPath} (${schemas.length} components, ${patterns.length} patterns)`);
console.log(`schema → ${minPath} (agent-minified)`);
console.log(`schema runtime → ${runtimePath}`);
console.log(`schema types → ${typesPath}`);
console.log(`schema component types → ${componentTypesPath}`);
console.log(`schema prompt → ${promptMarkdownPath}`);
console.log(`schema prompt module → ${promptModulePath}`);

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

function toTypeDeclarations(doc) {
  const { schemaComponents, elements } = collectTypeComponents(doc.components);
  const enumTypes = collectEnumTypes(elements);
  const sharedEnumTypes = collectSharedEnumTypes(enumTypes);
  const lines = [
    '/* Generated by src/schema/build.js — do not edit */',
    '',
    `export type AihioIntent = ${toUnion(Object.keys(doc.intents))};`,
    `export type AihioSchemaTagName = ${toUnion(schemaComponents.map(({ tag }) => tag))};`,
    `export type AihioTagName = ${toUnion(elements.map(({ tag }) => tag))};`,
    '',
    'export type AihioJSXAttributeValue = string | number | boolean | null | undefined;',
    '',
    'export interface AihioIntrinsicElementProps {',
    '  children?: unknown;',
    '  class?: string;',
    '  className?: string;',
    '  id?: string;',
    '  slot?: string;',
    '  part?: string;',
    '  style?: string | Partial<Record<string, string | number>>;',
    '  role?: string;',
    '  title?: string;',
    '  hidden?: boolean;',
    '  dir?: string;',
    '  lang?: string;',
    '  tabIndex?: number;',
    '  tabindex?: number | string;',
    '  [attribute: `aria-${string}`]: AihioJSXAttributeValue;',
    '  [attribute: `data-${string}`]: AihioJSXAttributeValue;',
    '  [attribute: `on${string}`]: ((event: Event) => unknown) | undefined;',
    '}',
    '',
    "export type AihioRuntimeAttributeType = 'string' | 'number' | 'boolean' | 'enum';",
    '',
    'export interface AihioRuntimeAttributeSchema {',
    '  type: AihioRuntimeAttributeType;',
    '  values?: readonly string[];',
    '  default?: string | number | boolean;',
    '}',
    '',
    'export interface AihioRuntimeSlotSchema {',
    '  accepts?: readonly string[];',
    '}',
    '',
    'export interface AihioRuntimeEventSchema {',
    '  detail?: Record<string, string>;',
    '}',
    '',
    'export interface AihioRuntimePropertySchema {',
    '  type: string;',
    '}',
    '',
    'export interface AihioRuntimeComposition {',
    '  allowedParents?: readonly string[];',
    '  requiredAncestors?: readonly string[];',
    '  allowedChildren?: readonly string[];',
    '  requiredChildren?: readonly string[];',
    '  forbiddenChildren?: readonly string[];',
    '  allowedSlots?: readonly string[];',
    '  requiredSlots?: readonly string[];',
    '}',
    '',
    "export type AihioRuntimeSeverity = 'error' | 'warn';",
    '',
    'export interface AihioRuntimeA11yRequirement {',
    '  when: string;',
    '  requirement: string;',
    '  severity: AihioRuntimeSeverity;',
    '}',
    '',
    'export interface AihioRuntimeA11yContract {',
    '  handled: readonly string[];',
    '  required?: readonly AihioRuntimeA11yRequirement[];',
    '}',
    '',
    'export interface AihioRuntimeCounterExample {',
    '  markup: string;',
    '}',
    '',
    'export interface AihioRuntimeRelatedComponentSchema {',
    '  $component: AihioTagName;',
    '}',
    '',
    'export interface AihioRuntimeComponentSchema {',
    '  $component: AihioSchemaTagName;',
    '  version: string;',
    '  intents: readonly AihioIntent[];',
    '  attributes?: Record<string, AihioRuntimeAttributeSchema>;',
    '  slots?: Record<string, AihioRuntimeSlotSchema>;',
    '  events?: Record<string, AihioRuntimeEventSchema>;',
    '  methods?: Record<string, Record<string, never>>;',
    '  properties?: Record<string, AihioRuntimePropertySchema>;',
    '  composition?: AihioRuntimeComposition;',
    '  a11yContract?: AihioRuntimeA11yContract;',
    '  counterExamples?: readonly AihioRuntimeCounterExample[];',
    '  related?: readonly AihioRuntimeRelatedComponentSchema[];',
    '}',
    '',
    'export interface AihioPatternVariation {',
    '  id: string;',
    '  name: string;',
    '  markup: string;',
    '}',
    '',
    'export interface AihioPattern {',
    '  id: string;',
    '  name: string;',
    '  intents: readonly AihioIntent[];',
    '  requiredComponents: readonly AihioSchemaTagName[];',
    '  markup: string;',
    '  variations: readonly AihioPatternVariation[];',
    '}',
    '',
    'export interface AihioSchemaDocument {',
    "  $schema: 'aihio-design-system';",
    '  version: string;',
    '  intents: readonly AihioIntent[];',
    '  components: readonly AihioRuntimeComponentSchema[];',
    '  patterns: readonly AihioPattern[];',
    '}',
    '',
    'export type AihioDescribeTarget =',
    '  | string',
    '  | Element',
    '  | { tag?: string | null; tagName?: string | null }',
    '  | null',
    '  | undefined;',
    '',
    'export interface AihioNamespace {',
    '  describe(target: AihioDescribeTarget): AihioRuntimeComponentSchema | null;',
    '  defineAll(): boolean[];',
    '  schema: AihioSchemaDocument;',
    '}',
    '',
  ];

  for (const sharedEnum of sharedEnumTypes) {
    lines.push(`export type ${sharedEnum.typeName} = ${toUnion(sharedEnum.values)};`, '');
  }

  for (const enumType of enumTypes) {
    lines.push(`export type ${enumType.typeName} = ${toUnion(enumType.values)};`, '');
  }

  for (const component of elements) {
    lines.push(...renderComponentTypeBlock(component), '');
  }

  lines.push(
    'export interface AihioJSXIntrinsicElements {',
    ...elements.map((component) => `  ${JSON.stringify(component.tag)}: ${component.className}Props;`),
    '}',
    '',
    'export declare function defineAll(): boolean[];',
    'export declare function describe(target: AihioDescribeTarget): AihioRuntimeComponentSchema | null;',
    'export declare const Aihio: AihioNamespace;',
    '',
    'declare global {',
    '  interface HTMLElementTagNameMap {',
    ...elements.map((component) => `    ${JSON.stringify(component.tag)}: ${component.className};`),
    '  }',
    '',
    '  namespace JSX {',
    '    interface IntrinsicElements extends AihioJSXIntrinsicElements {}',
    '  }',
    '',
    '  namespace React {',
    '    namespace JSX {',
    '      interface IntrinsicElements extends AihioJSXIntrinsicElements {}',
    '    }',
    '  }',
    '}'
  );

  return `${lines.join('\n')}\n`;
}

function toComponentTypeDeclarations(doc) {
  const { elements } = collectTypeComponents(doc.components);
  const enumTypes = collectEnumTypes(elements);
  const sharedEnumTypes = collectSharedEnumTypes(enumTypes);
  const classExports = elements.map(({ className }) => className);
  const typeExports = unique([
    'AihioJSXAttributeValue',
    'AihioIntrinsicElementProps',
    'AihioTagName',
    ...sharedEnumTypes.map(({ typeName }) => typeName),
    ...enumTypes.map(({ typeName }) => typeName),
    ...elements.flatMap(({ className }) => [`${className}Attributes`, `${className}Props`]),
  ]);

  return [
    '/* Generated by src/schema/build.js — do not edit */',
    '',
    formatNamedExport(classExports, { from: './aihio.js' }),
    '',
    formatNamedExport(typeExports, { from: './aihio.js', typeOnly: true }),
    '',
  ].join('\n');
}

function toPromptMarkdown(doc) {
  const template = readFileSync(promptTemplatePath, 'utf8').trim();
  const sections = {
    'component-inventory': buildPromptComponentInventory(doc),
    'intent-map': buildPromptIntentMap(doc),
    'pattern-inventory': buildPromptPatternInventory(doc),
    'a11y-obligations': buildPromptA11yObligations(doc),
    'hard-rules': buildPromptHardRules(doc),
    'token-vocabulary': buildPromptTokenVocabulary(),
  };

  let output = template;

  for (const [name, section] of Object.entries(sections)) {
    output = replacePromptSection(output, name, section);
  }

  const unresolved = output.match(/<!-- GENERATED:([a-z-]+) -->/g);
  if (unresolved) {
    throw new Error(`Prompt template still has unresolved placeholders: ${unresolved.join(', ')}`);
  }

  return `${output.trim()}\n`;
}

function replacePromptSection(template, name, content) {
  const marker = `<!-- GENERATED:${name} -->`;
  if (!template.includes(marker)) {
    throw new Error(`Prompt template is missing ${marker}`);
  }

  return template.replace(marker, content.trim());
}

function buildPromptComponentInventory(doc) {
  const lines = [
    '## Component Inventory',
    '',
    'Use top-level components first, then reach for related subcomponents only inside their intended parent patterns.',
    '',
    '### Top-Level Components',
    '',
  ];

  for (const component of doc.components) {
    lines.push(`- \`${component.$component}\` - ${component.description}`);
    lines.push(`  Intents: ${formatList(component.intents, 'none')}.`);
    lines.push(`  Attributes: ${formatAttributeSummary(component.attributes)}.`);
    lines.push(`  Slots: ${formatNamedKeys(component.slots)}.`);
    lines.push(`  Methods: ${formatMethodSummary(component.methods)}.`);
    lines.push(`  Requires: ${formatCompositionRequirements(component.composition)}.`);
    lines.push(`  Related: ${formatRelatedSummary(component.related)}.`);
    lines.push('');
  }

  lines.push('### Related Subcomponents', '');

  for (const component of doc.components) {
    for (const related of component.related ?? []) {
      lines.push(`- \`${related.$component}\` - ${related.description}`);
      lines.push(`  Parent: \`${component.$component}\`.`);
      lines.push(`  Attributes: ${formatAttributeSummary(related.attributes)}.`);
      lines.push(`  Events: ${formatEventSummary(related.events)}.`);
      lines.push(`  Methods: ${formatMethodSummary(related.methods)}.`);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

function buildPromptIntentMap(doc) {
  const lines = [
    '## Intent to Component Map',
    '',
    'Map requested meaning to these schema-backed components before thinking about visual treatment.',
    '',
  ];

  for (const [intent, description] of Object.entries(doc.intents)) {
    const matches = doc.components
      .filter((component) => component.intents.includes(intent))
      .map((component) => `\`${component.$component}\``);

    lines.push(`- \`${intent}\` - ${description}`);
    lines.push(`  Components: ${matches.length > 0 ? matches.join(', ') : 'no direct top-level component; resolve through composition'}.`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

function buildPromptPatternInventory(doc) {
  const lines = [
    '## Pattern Inventory',
    '',
    'Start from these canonical compositions when the request already matches one of them.',
    '',
  ];

  for (const pattern of doc.patterns) {
    lines.push(`- \`${pattern.id}\` - ${pattern.description}`);
    lines.push(`  Intents: ${formatList(pattern.intents, 'none')}.`);
    lines.push(`  Required components: ${formatList(pattern.requiredComponents, 'none')}.`);
    lines.push(`  Variations: ${formatVariationSummary(pattern.variations)}.`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

function buildPromptA11yObligations(doc) {
  const lines = [
    '## Accessibility Obligations',
    '',
    'These are author responsibilities the components do not infer for you automatically.',
    '',
  ];

  for (const component of doc.components) {
    for (const requirement of component.a11yContract?.required ?? []) {
      lines.push(`- \`${component.$component}\` (${requirement.severity}) - when ${requirement.when}, ${requirement.requirement}`);
    }
  }

  return lines.join('\n').trim();
}

function buildPromptHardRules(doc) {
  const lines = [
    '## Hard Rules from Counterexamples',
    '',
    'Do not invent unsupported APIs or invalid compositions. Treat these schema-backed mistakes as hard failures.',
    '',
  ];

  for (const component of doc.components) {
    for (const example of component.counterExamples ?? []) {
      lines.push(`- \`${component.$component}\` - avoid \`${compactMarkup(example.markup)}\` - ${example.reason}`);
    }
  }

  return lines.join('\n').trim();
}

function buildPromptTokenVocabulary() {
  const tokens = collectPromptTokens();
  const sections = [
    ['color', 'Theme-aware color intent tokens used for actions, surfaces, overlays, borders, and state.'],
    ['spacing', 'Spacing tokens that describe layout rhythm and field padding by meaning.'],
    ['radius', 'Radius tokens for interactive controls and surfaced containers.'],
    ['fontSize', 'Typography size tokens for body text, controls, and headings.'],
    ['fontWeight', 'Typography weight tokens for body text, controls, and badges.'],
    ['lineHeight', 'Readable and compact line-height intents.'],
    ['shadow', 'Elevation tokens for surfaces and overlays.'],
    ['duration', 'Motion timing tokens for control feedback and overlay entrance.'],
  ];
  const lines = [
    '## Token Intent Vocabulary',
    '',
    'Prefer these meaning-based token names when describing styling or reasoning about visual emphasis.',
    '',
  ];

  for (const [family, intro] of sections) {
    const entries = tokens.filter((token) => token.path.startsWith(`${family}.intent.`));
    if (entries.length === 0) continue;

    lines.push(`### ${family}`);
    lines.push('');
    lines.push(intro);
    lines.push('');
    for (const token of entries) {
      lines.push(`- \`${token.path}\` - ${token.description || 'No description.'}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

function collectPromptTokens() {
  const combined = new Map();
  const tokens = [
    ...listIntentTokens(intentTokens.shared),
    ...listIntentTokens(intentTokens.light),
    ...listIntentTokens(intentTokens.dark),
  ];

  for (const token of tokens) {
    const current = combined.get(token.path);
    if (!current) {
      combined.set(token.path, { ...token });
      continue;
    }

    current.description ||= token.description;
  }

  return [...combined.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function listIntentTokens(node, prefix = '') {
  if (!node || typeof node !== 'object') return [];

  const entries = [];
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue;

    const path = prefix ? `${prefix}.${key}` : key;
    if (!value || typeof value !== 'object') continue;

    if (Object.prototype.hasOwnProperty.call(value, '$value')) {
      entries.push({
        path,
        description: value.$description ?? '',
      });
      continue;
    }

    entries.push(...listIntentTokens(value, path));
  }

  return entries;
}

function toPromptModule(promptMarkdown) {
  return `/* Generated by src/schema/build.js — do not edit */\n\nconst prompt = ${JSON.stringify(promptMarkdown)};\n\nexport default prompt;\nexport { prompt };\n`;
}

function toStringModuleTypes() {
  return '/* Generated by src/schema/build.js — do not edit */\n\ndeclare const prompt: string;\n\nexport default prompt;\nexport { prompt };\n';
}

function collectTypeComponents(components) {
  const schemaComponents = components.map((component) => normalizeTypeComponent(component, true));
  const seen = new Set(schemaComponents.map(({ tag }) => tag));
  const relatedComponents = [];

  for (const component of components) {
    for (const related of component.related ?? []) {
      if (!related?.$component || seen.has(related.$component)) continue;
      seen.add(related.$component);
      relatedComponents.push(normalizeTypeComponent(related, false));
    }
  }

  return {
    schemaComponents: schemaComponents.sort(compareTypeComponents),
    elements: [...schemaComponents, ...relatedComponents].sort(compareTypeComponents),
  };
}

function normalizeTypeComponent(component, schemaBacked) {
  return {
    tag: component.$component,
    className: toPascalCase(component.$component),
    schemaBacked,
    attributes: component.attributes ?? {},
    methods: component.methods ?? {},
    properties: component.properties ?? {},
  };
}

function compareTypeComponents(left, right) {
  return left.tag.localeCompare(right.tag);
}

function collectEnumTypes(components) {
  const enumTypes = [];

  for (const component of components) {
    for (const [name, attr] of Object.entries(component.attributes)) {
      if (attr.type !== 'enum' || !Array.isArray(attr.values) || attr.values.length === 0) {
        continue;
      }

      enumTypes.push({
        attrName: name,
        componentTag: component.tag,
        typeName: `${component.className}${toPascalCase(name)}`,
        values: attr.values,
      });
    }
  }

  return enumTypes.sort((left, right) => {
    if (left.typeName === right.typeName) {
      return left.componentTag.localeCompare(right.componentTag);
    }

    return left.typeName.localeCompare(right.typeName);
  });
}

function collectSharedEnumTypes(enumTypes) {
  const groups = new Map();

  for (const enumType of enumTypes) {
    let group = groups.get(enumType.attrName);
    if (!group) {
      group = {
        count: 0,
        values: new Set(),
      };
      groups.set(enumType.attrName, group);
    }

    group.count += 1;
    for (const value of enumType.values) {
      group.values.add(value);
    }
  }

  return [...groups.entries()]
    .filter(([, group]) => group.count > 1)
    .map(([name, group]) => ({
      typeName: `Aihio${toPascalCase(name)}`,
      values: [...group.values],
    }))
    .sort((left, right) => left.typeName.localeCompare(right.typeName));
}

function renderComponentTypeBlock(component) {
  const lines = [];
  const attributes = Object.entries(component.attributes);
  const properties = Object.entries(component.properties);
  const methods = Object.keys(component.methods)
    .map(parseMethodName)
    .filter(Boolean);

  if (attributes.length === 0) {
    lines.push(`export interface ${component.className}Attributes {}`);
  } else {
    lines.push(`export interface ${component.className}Attributes {`);
    for (const [name, attr] of attributes) {
      lines.push(`  ${formatTypeKey(name)}?: ${toAttributeType(component, name, attr)};`);
    }
    lines.push('}');
  }

  lines.push(
    `export type ${component.className}Props = AihioIntrinsicElementProps & ${component.className}Attributes;`,
    '',
    `export declare class ${component.className} extends HTMLElement {`,
    `  static tag: ${JSON.stringify(component.tag)};`
  );

  if (component.schemaBacked) {
    lines.push('  static schemaVersion: string | undefined;');
  }

  for (const [name, descriptor] of properties) {
    lines.push(`  ${formatTypeKey(name)}: ${toPropertyType(descriptor.type)};`);
  }

  for (const methodName of methods) {
    lines.push(`  ${methodName}(): void;`);
  }

  lines.push('}');

  return lines;
}

function toAttributeType(component, name, attr) {
  if (attr.type === 'enum' && Array.isArray(attr.values) && attr.values.length > 0) {
    return `${component.className}${toPascalCase(name)}`;
  }

  return toPrimitiveType(attr.type);
}

function toPropertyType(type) {
  return toPrimitiveType(type);
}

function toPrimitiveType(type) {
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'unknown';
  }
}

function parseMethodName(signature) {
  const match = /^([A-Za-z_$][A-Za-z0-9_$]*)\(\)$/.exec(signature);
  return match?.[1] ?? null;
}

function formatTypeKey(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function toPascalCase(value) {
  return String(value)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toUnion(values) {
  return values.length > 0 ? values.map((value) => JSON.stringify(value)).join(' | ') : 'never';
}

function formatNamedExport(names, { from, typeOnly = false }) {
  const uniqueNames = unique(names);
  return [
    `export${typeOnly ? ' type' : ''} {`,
    ...uniqueNames.map((name) => `  ${name},`),
    `} from ${JSON.stringify(from)};`,
  ].join('\n');
}

function formatList(values, fallback = 'none') {
  return Array.isArray(values) && values.length > 0
    ? values.map((value) => `\`${value}\``).join(', ')
    : fallback;
}

function formatNamedKeys(object) {
  const keys = Object.keys(object ?? {});
  return formatList(keys);
}

function formatAttributeSummary(attributes) {
  const entries = Object.entries(attributes ?? {});
  if (entries.length === 0) return 'none';

  return entries
    .map(([name, attr]) => {
      if (attr.type === 'enum' && Array.isArray(attr.values) && attr.values.length > 0) {
        return `\`${name}=${attr.values.join('|')}\``;
      }

      if (attr.type === 'boolean') {
        return `\`${name}\``;
      }

      return `\`${name}=${attr.type}\``;
    })
    .join(', ');
}

function formatMethodSummary(methods) {
  const entries = Object.keys(methods ?? {});
  return entries.length > 0 ? entries.map((method) => `\`${method}\``).join(', ') : 'none';
}

function formatEventSummary(events) {
  const entries = Object.keys(events ?? {});
  return entries.length > 0 ? entries.map((event) => `\`${event}\``).join(', ') : 'none';
}

function formatCompositionRequirements(composition) {
  if (!composition || typeof composition !== 'object') return 'none';

  const parts = [];

  if (Array.isArray(composition.requiredSlots) && composition.requiredSlots.length > 0) {
    parts.push(`slots ${formatList(composition.requiredSlots)}`);
  }

  if (Array.isArray(composition.requiredChildren) && composition.requiredChildren.length > 0) {
    parts.push(`children ${formatList(composition.requiredChildren)}`);
  }

  if (Array.isArray(composition.requiredAncestors) && composition.requiredAncestors.length > 0) {
    parts.push(`ancestors ${formatList(composition.requiredAncestors)}`);
  }

  return parts.length > 0 ? parts.join('; ') : 'none';
}

function formatRelatedSummary(related) {
  return Array.isArray(related) && related.length > 0
    ? related.map((entry) => `\`${entry.$component}\``).join(', ')
    : 'none';
}

function formatVariationSummary(variations) {
  if (!Array.isArray(variations) || variations.length === 0) return 'none';

  return variations
    .map((variation) => `\`${variation.id}\` (${variation.description})`)
    .join(', ');
}

function compactMarkup(markup, maxLength = 140) {
  const compact = String(markup ?? '').replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3)}...`;
}

function unique(values) {
  return [...new Set(values)];
}
