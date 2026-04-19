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
  const severity = typeof warning?.severity === 'string' ? `${warning.severity}: ` : '';
  return `[aihio] ${tag}: ${severity}${warning.message}`;
}

const a11yRequirementCheckers = {
  'aihio-alert': {
    'variant="destructive"': (element) =>
      element.getAttribute?.('variant') === 'destructive' &&
      !hasNamedSlotContent(element, 'title') &&
      !hasNamedSlotContent(element, 'description'),
  },
  'aihio-avatar': {
    'src is set': (element) =>
      hasNonEmptyAttribute(element, 'src') && !element.hasAttribute?.('alt'),
    'src is not set and fallback is empty': (element) =>
      !hasNonEmptyAttribute(element, 'src') &&
      normalizeText(element.getAttribute?.('fallback')).length === 0 &&
      normalizeText(element.getAttribute?.('alt')).length === 0,
  },
  'aihio-button': {
    'size="icon" or the button has no visible text': (element) =>
      requiresExplicitAccessibleName(element) && !hasAccessibleName(element),
  },
  'aihio-dialog': {
    'dialog has no aihio-dialog-title': (element) =>
      !element.querySelector?.('aihio-dialog-title') &&
      !hasNonEmptyAttribute(element, 'aria-label'),
  },
  'aihio-dropdown': {
    'the trigger is icon-only': (element) => {
      const trigger = getDropdownTrigger(element);
      return Boolean(trigger && requiresExplicitAccessibleName(trigger) && !hasAccessibleName(trigger));
    },
  },
  'aihio-input': {
    'input has no visible <label> associated by for/id': (element) => !hasAssociatedLabel(element),
    'error=true': (element) =>
      element.hasAttribute?.('error') && !referencesExistingIds(element, 'aria-describedby'),
  },
  'aihio-tabs': {
    'every aihio-tab and aihio-tab-panel': (element) => !hasExactTabValuePairs(element),
  },
  'aihio-toggle': {
    'toggle has no visible text (icon-only)': (element) =>
      requiresExplicitAccessibleName(element) && !hasAccessibleName(element),
  },
};

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
  const warnings = [];
  const checkers = a11yRequirementCheckers[schema.$component];

  if (!checkers) {
    return warnings;
  }

  for (const requirement of schema.a11yContract?.required ?? []) {
    const checker = checkers[requirement.when];
    if (!checker) continue;
    if (!checker(element, requirement, schema)) continue;

    warnings.push({
      key: `a11y:${schema.$component}:${requirement.when}`,
      message: requirement.requirement,
      severity: requirement.severity,
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

function requiresExplicitAccessibleName(element) {
  return (
    element?.getAttribute?.('size') === 'icon' ||
    normalizeText(element?.textContent).length === 0
  );
}

function hasNamedSlotContent(element, slotName) {
  return [...element.querySelectorAll?.(`[slot="${slotName}"]`) ?? []].some((node) => {
    if (normalizeText(node.textContent).length > 0) return true;
    return node.childElementCount > 0;
  });
}

function getDropdownTrigger(element) {
  return element.querySelector?.('[slot="trigger"]') ?? null;
}

function hasExactTabValuePairs(element) {
  const tabs = [...element.querySelectorAll?.('aihio-tab') ?? []];
  const panels = [...element.querySelectorAll?.('aihio-tab-panel') ?? []];

  if (tabs.length === 0 && panels.length === 0) {
    return true;
  }

  if (tabs.length === 0 || panels.length === 0) {
    return false;
  }

  const tabCounts = countAttributeValues(tabs, 'value');
  const panelCounts = countAttributeValues(panels, 'value');

  if (tabCounts.size !== panelCounts.size) {
    return false;
  }

  for (const [value, count] of tabCounts) {
    if (count !== 1 || panelCounts.get(value) !== 1) {
      return false;
    }
  }

  for (const count of panelCounts.values()) {
    if (count !== 1) {
      return false;
    }
  }

  return true;
}

function countAttributeValues(elements, attrName) {
  const counts = new Map();

  for (const element of elements) {
    const value = element.getAttribute?.(attrName) ?? '';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
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
