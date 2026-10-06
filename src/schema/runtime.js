import runtimeSchemaDocument from './runtime-schema.js';
import { collectA11yRuleViolations } from './a11y-rules.js';
import { collectMarkupRuleViolations } from './markup-rules.js';
import { suggestEnumValue } from './suggestions.js';

export const runtimeSchema = deepFreeze(runtimeSchemaDocument);

const componentSchemaByTag = new Map(
  runtimeSchema.components.map((component) => [component.$component, component])
);

const domAdapter = {
  tag: (node) => node?.tagName?.toLowerCase?.() ?? null,
  children: (node) => [...(node?.children ?? [])],
  parent: (node) => node?.parentElement ?? null,
  attr: (node, name) => node?.getAttribute?.(name) ?? null,
  hasAttr: (node, name) => node?.hasAttribute?.(name) ?? false,
  text: (node) => node?.textContent ?? '',
  root: (node) => node?.ownerDocument?.documentElement ?? node,
};

export function describe(target) {
  const tag = normalizeTag(target);
  return tag ? componentSchemaByTag.get(tag) ?? null : null;
}

export function getSchemaVersion(target) {
  return describe(target)?.version ?? null;
}

export function collectDevWarnings(element) {
  const schema = describe(element);
  if (!schema || !element) return [];
  return dedupeWarnings([
    ...collectEnumWarnings(element, schema.attributes),
    ...collectNativeElementWarnings(element, schema),
    ...collectMarkupWarnings(element, schema),
    ...collectA11yWarnings(element, schema),
  ]);
}

export function formatDevWarning(element, warning) {
  const tag = normalizeTag(element) ?? 'aihio-element';
  const severity = typeof warning?.severity === 'string' ? `${warning.severity}: ` : '';
  return `[aihio] ${tag}: ${severity}${warning.message}`;
}

/** `on` names the native element the attributes are on, when they are not the host's. */
function collectEnumWarnings(element, attributes, on = '') {
  const warnings = [];
  for (const [name, attr] of Object.entries(attributes ?? {})) {
    if (attr.type !== 'enum' || !element.hasAttribute?.(name)) continue;
    const value = element.getAttribute(name);
    if (attr.values?.includes(value)) continue;
    const suggestion = suggestEnumValue(value, attr.values);
    warnings.push({
      key: `enum:${on}${name}:${value}`,
      message: `invalid ${name}="${value}"${on ? ` on <${on}>` : ''}. ${suggestion ? `Use ${name}="${suggestion}". ` : ''}Expected one of: ${attr.values.join(', ')}.`,
    });
  }
  return warnings;
}

/** The native elements the component enhances, held to the same rules as its own attributes. */
function collectNativeElementWarnings(element, schema) {
  const warnings = [];
  for (const [tag, definition] of Object.entries(schema.nativeElements ?? {})) {
    for (const child of element.querySelectorAll?.(tag) ?? []) {
      if (nearestAihioAncestor(child) !== element) continue;
      warnings.push(...collectEnumWarnings(child, definition.attributes, tag));
      warnings.push(...collectMarkupRuleViolations(child, definition.attributes, domAdapter).map((violation) => ({
        key: `markup:${tag}:${violation.key}`,
        message: `<${tag}>: ${violation.message}`,
        severity: violation.severity,
      })));
    }
  }
  return warnings;
}

function nearestAihioAncestor(element) {
  let current = element.parentElement;
  while (current && !current.localName.startsWith('aihio-')) current = current.parentElement;
  return current;
}

function collectMarkupWarnings(element, schema) {
  return collectMarkupRuleViolations(element, schema.attributes, domAdapter).map((violation) => ({
    key: `markup:${schema.$component}:${violation.key}`,
    message: violation.message,
    severity: violation.severity,
  }));
}

function collectA11yWarnings(element, schema) {
  return collectA11yRuleViolations(element, schema, domAdapter).map((requirement) => ({
    key: `a11y:${schema.$component}:${requirement.rule}`,
    message: requirement.requirement,
    severity: requirement.severity,
  }));
}

function normalizeTag(target) {
  if (typeof target === 'string') return target.toLowerCase();
  if (typeof target?.tag === 'string') return target.tag.toLowerCase();
  if (typeof target?.tagName === 'string') return target.tagName.toLowerCase();
  return null;
}

function dedupeWarnings(warnings) {
  const seen = new Set();
  return warnings.filter((warning) => {
    if (!warning?.key || seen.has(warning.key)) return false;
    seen.add(warning.key);
    return true;
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
