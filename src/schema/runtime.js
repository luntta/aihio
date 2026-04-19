import runtimeSchemaDocument from './runtime-schema.js';

const buildTimeDev = typeof __AIHIO_DEV__ !== 'undefined' ? __AIHIO_DEV__ : undefined;

export const AIHIO_DEV = buildTimeDev ?? globalThis.__AIHIO_DEV__ ?? false;

export const runtimeSchema = deepFreeze(runtimeSchemaDocument);

const componentSchemaByTag = new Map(
  runtimeSchema.components.map((component) => [component.$component, component])
);

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

  const warnings = [
    ...collectEnumWarnings(element, schema),
    ...collectA11yWarnings(element, schema),
  ];

  return dedupeWarnings(warnings);
}

export function formatDevWarning(element, warning) {
  const tag = normalizeTag(element) ?? 'aihio-element';
  return `[aihio] ${tag}: ${warning.message}`;
}

function collectEnumWarnings(element, schema) {
  const warnings = [];

  for (const [name, attr] of Object.entries(schema.attributes ?? {})) {
    if (attr.type !== 'enum') continue;
    if (!element.hasAttribute?.(name)) continue;

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
  switch (schema.$component) {
    case 'aihio-button':
      return collectButtonWarnings(element);
    case 'aihio-dialog':
      return collectDialogWarnings(element);
    case 'aihio-input':
      return collectInputWarnings(element);
    default:
      return [];
  }
}

function collectButtonWarnings(element) {
  const requiresExplicitName =
    element.getAttribute?.('size') === 'icon' ||
    normalizeText(element.textContent).length === 0;

  if (!requiresExplicitName || hasAccessibleName(element)) {
    return [];
  }

  return [{
    key: 'a11y:accessible-name',
    message: 'missing accessible name. Add aria-label or aria-labelledby to the button.',
  }];
}

function collectDialogWarnings(element) {
  const hasTitle = Boolean(element.querySelector?.('aihio-dialog-title'));
  const hasAriaLabel = hasNonEmptyAttribute(element, 'aria-label');

  if (hasTitle || hasAriaLabel) {
    return [];
  }

  return [{
    key: 'a11y:dialog-name',
    message: 'missing dialog name. Add <aihio-dialog-title> or aria-label on the host.',
  }];
}

function collectInputWarnings(element) {
  const warnings = [];

  if (!hasAssociatedLabel(element)) {
    warnings.push({
      key: 'a11y:input-label',
      message: 'missing associated label. Wrap in <label>, add label[for], aria-label, or aria-labelledby.',
    });
  }

  if (element.hasAttribute?.('error') && !referencesExistingIds(element, 'aria-describedby')) {
    warnings.push({
      key: 'a11y:error-description',
      message: 'error state needs aria-describedby pointing to a visible message.',
    });
  }

  return warnings;
}

function hasAssociatedLabel(element) {
  if (hasNonEmptyAttribute(element, 'aria-label')) return true;
  if (referencesExistingIds(element, 'aria-labelledby')) return true;
  if (element.closest?.('label')) return true;

  const id = element.getAttribute?.('id') ?? element.id;
  if (!id) return false;

  const ownerDocument = element.ownerDocument;
  if (!ownerDocument?.querySelectorAll) return false;

  return [...ownerDocument.querySelectorAll('label[for]')].some(
    (label) => label.getAttribute('for') === id
  );
}

function hasAccessibleName(element) {
  return (
    hasNonEmptyAttribute(element, 'aria-label') ||
    referencesExistingIds(element, 'aria-labelledby') ||
    normalizeText(element.textContent).length > 0
  );
}

function referencesExistingIds(element, attrName) {
  const raw = element.getAttribute?.(attrName);
  if (!raw) return false;

  const ownerDocument = element.ownerDocument;
  if (!ownerDocument?.getElementById) return false;

  return raw
    .split(/\s+/)
    .filter(Boolean)
    .every((id) => Boolean(ownerDocument.getElementById(id)));
}

function hasNonEmptyAttribute(element, name) {
  const value = element.getAttribute?.(name);
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeTag(target) {
  if (typeof target === 'string') return target.toLowerCase();
  if (typeof target?.tag === 'string') return target.tag.toLowerCase();
  if (typeof target?.tagName === 'string') return target.tagName.toLowerCase();
  return null;
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function dedupeWarnings(warnings) {
  const seen = new Set();
  const deduped = [];

  for (const warning of warnings) {
    if (!warning?.key || seen.has(warning.key)) continue;
    seen.add(warning.key);
    deduped.push(warning);
  }

  return deduped;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return value;
}
