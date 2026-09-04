import runtimeSchemaDocument from './runtime-schema.js';
import { collectA11yRuleViolations } from './a11y-rules.js';

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
    ...collectEnumWarnings(element, schema),
    ...collectA11yWarnings(element, schema),
  ]);
}

export function formatDevWarning(element, warning) {
  const tag = normalizeTag(element) ?? 'aihio-element';
  const severity = typeof warning?.severity === 'string' ? `${warning.severity}: ` : '';
  return `[aihio] ${tag}: ${severity}${warning.message}`;
}

function collectEnumWarnings(element, schema) {
  const warnings = [];
  for (const [name, attr] of Object.entries(schema.attributes ?? {})) {
    if (attr.type !== 'enum' || !element.hasAttribute?.(name)) continue;
    const value = element.getAttribute(name);
    if (attr.values?.includes(value)) continue;
    warnings.push({
      key: `enum:${name}:${value}`,
      message: `invalid ${name}="${value}". Expected one of: ${attr.values.join(', ')}.`,
    });
  }
  return warnings;
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
