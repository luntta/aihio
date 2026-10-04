export const A11Y_RULE_IDS = new Set([
  'alert-announced-content',
  'avatar-alt',
  'avatar-fallback',
  'button-accessible-name',
  'button-form-owner',
  'button-link-attributes',
  'button-link-href',
  'button-link-navigation',
  'combobox-form-name',
  'combobox-label',
  'combobox-option-values',
  'dialog-accessible-name',
  'dropdown-trigger-name',
  'field-label',
  'input-label',
  'input-error-description',
  'input-form-name',
  'switch-form-name',
  'switch-label',
  'tabs-value-pairs',
  'toggle-accessible-name',
]);

const RULES = {
  'alert-announced-content': (node, api) =>
    api.attr(node, 'variant') === 'destructive' &&
    !hasNamedSlotContent(node, 'title', api) &&
    !hasNamedSlotContent(node, 'description', api),

  'avatar-alt': (node, api) =>
    hasNonEmptyAttribute(node, 'src', api) && !api.hasAttr(node, 'alt'),

  'avatar-fallback': (node, api) =>
    !hasNonEmptyAttribute(node, 'src', api) &&
    normalizeText(api.attr(node, 'fallback')).length === 0 &&
    normalizeText(api.attr(node, 'alt')).length === 0,

  'button-accessible-name': (node, api) =>
    requiresExplicitAccessibleName(node, api) && !hasAccessibleName(node, api),

  'button-form-owner': (node, api) => {
    const type = api.attr(node, 'type');
    if (type !== 'submit' && type !== 'reset') return false;
    if (findAncestor(node, 'form', api)) return false;
    const formId = api.attr(node, 'form');
    return !formId || api.tag(findById(node, formId, api)) !== 'form';
  },

  'button-link-attributes': (node, api) =>
    api.tag(buttonControl(node, api)) === 'a' &&
    BUTTON_ONLY_ATTRIBUTES.some((name) => api.hasAttr(node, name)),

  'button-link-href': (node, api) => {
    const control = buttonControl(node, api);
    return api.tag(control) === 'a' && !hasNonEmptyAttribute(control, 'href', api);
  },

  'button-link-navigation': (node, api) =>
    NAVIGATION_HANDLER_ATTRIBUTES.some((name) => NAVIGATION_HANDLER.test(api.attr(node, name) ?? '')),

  'combobox-form-name': (node, api) =>
    api.tag(owningForm(node, api)) === 'form' && !hasNonEmptyAttribute(node, 'name', api),

  // Deliberately stricter than input-label: a wrapping <label> takes its name
  // from all of its text, which would include the options of an open list.
  'combobox-label': (node, api) =>
    !findAncestor(node, 'aihio-field', api) &&
    !hasNonEmptyAttribute(node, 'aria-label', api) &&
    !referencesExistingIds(node, 'aria-labelledby', api),

  'combobox-option-values': (node, api) => {
    const seen = new Set();
    for (const option of api.children(node)) {
      if (api.tag(option) !== 'aihio-option') continue;
      const value = api.hasAttr(option, 'value')
        ? api.attr(option, 'value')
        : normalizeText(api.attr(option, 'label') ?? api.text(option));
      if (seen.has(value)) return true;
      seen.add(value);
    }
    return false;
  },

  'dialog-accessible-name': (node, api) =>
    ownedDescendants(node, 'aihio-dialog-title', 'aihio-dialog', api).length === 0 &&
    !hasNonEmptyAttribute(node, 'aria-label', api),

  'dropdown-trigger-name': (node, api) => {
    const trigger = api.children(node).find((child) => api.attr(child, 'slot') === 'trigger');
    return Boolean(
      trigger &&
      requiresExplicitAccessibleName(trigger, api) &&
      !hasAccessibleName(trigger, api)
    );
  },

  'field-label': (node, api) => {
    const owned = descendants(node, api).filter(
      (child) => nearestOwner(child, 'aihio-field', api) === node
    );
    const label = owned.find((child) => api.attr(child, 'slot') === 'label');
    if (label && hasContent(label, api)) return false;
    const control = owned.find((child) =>
      ['aihio-input', 'aihio-combobox', 'aihio-switch', 'input', 'select', 'textarea'].includes(api.tag(child))
    );
    return !control || !hasNonEmptyAttribute(control, 'aria-label', api);
  },

  'input-label': (node, api) => !hasAssociatedLabel(node, api),

  'input-error-description': (node, api) =>
    api.hasAttr(node, 'error') && !referencesExistingIds(node, 'aria-describedby', api),

  'input-form-name': (node, api) =>
    api.tag(owningForm(node, api)) === 'form' && !hasNonEmptyAttribute(node, 'name', api),

  'switch-form-name': (node, api) =>
    api.tag(owningForm(node, api)) === 'form' && !hasNonEmptyAttribute(node, 'name', api),

  'switch-label': (node, api) => !hasAssociatedLabel(node, api),

  'tabs-value-pairs': (node, api) => !hasExactTabValuePairs(node, api),

  'toggle-accessible-name': (node, api) =>
    requiresExplicitAccessibleName(node, api) && !hasAccessibleName(node, api),
};

// Attributes that configure the <button> aihio-button renders. With an authored
// <a> as the control they reach nothing.
const BUTTON_ONLY_ATTRIBUTES = [
  'type',
  'name',
  'value',
  'form',
  'formaction',
  'formmethod',
  'formenctype',
  'formnovalidate',
  'formtarget',
  'command',
  'commandfor',
];

// A click handler that changes the page: the shape of a link written as a
// button. Template bindings parse as attributes too (@click, v-on:click).
const NAVIGATION_HANDLER_ATTRIBUTES = ['onclick', '@click', 'v-on:click', 'x-on:click'];
const NAVIGATION_HANDLER =
  /\b(?:(?:window|document|self|top)\.)?location(?:\.href)?\s*=(?!=)|\blocation\.(?:assign|replace)\s*\(|\bwindow\.open\s*\(|\brouter\.push\s*\(|\bnavigate\s*\(\s*['"`]/;

export function collectA11yRuleViolations(node, schema, api) {
  const violations = [];
  for (const requirement of schema.a11yContract?.required ?? []) {
    if (!requirement.rule) continue;
    const checker = RULES[requirement.rule];
    if (checker?.(node, api)) violations.push(requirement);
  }
  return violations;
}

/** The control aihio-button delegates to: its first <button> or <a> child. */
function buttonControl(node, api) {
  return api.children(node).find((child) => ['button', 'a'].includes(api.tag(child))) ?? null;
}

function owningForm(node, api) {
  const formId = api.attr(node, 'form');
  return findAncestor(node, 'form', api) ?? (formId ? findById(node, formId, api) : null);
}

function hasAssociatedLabel(node, api) {
  if (findAncestor(node, 'aihio-field', api)) return true;
  if (hasNonEmptyAttribute(node, 'aria-label', api)) return true;
  if (referencesExistingIds(node, 'aria-labelledby', api)) return true;
  if (findAncestor(node, 'label', api)) return true;

  const id = api.attr(node, 'id');
  if (!id) return false;
  return descendants(api.root(node), api).some(
    (candidate) => api.tag(candidate) === 'label' && api.attr(candidate, 'for') === id
  );
}

function hasAccessibleName(node, api) {
  if (hasNonEmptyAttribute(node, 'aria-label', api)) return true;
  if (referencesExistingIds(node, 'aria-labelledby', api)) return true;
  if (api.attr(node, 'size') === 'icon') return false;
  return normalizeText(api.text(node)).length > 0;
}

function requiresExplicitAccessibleName(node, api) {
  return api.attr(node, 'size') === 'icon' || normalizeText(api.text(node)).length === 0;
}

function hasNamedSlotContent(node, slotName, api) {
  return descendants(node, api).some(
    (child) => api.attr(child, 'slot') === slotName && hasContent(child, api)
  );
}

function hasContent(node, api) {
  return normalizeText(api.text(node)).length > 0 || api.children(node).length > 0;
}

function referencesExistingIds(node, attrName, api) {
  const raw = api.attr(node, attrName);
  if (!raw) return false;
  return raw.split(/\s+/).filter(Boolean).every((id) => Boolean(findById(node, id, api)));
}

function findById(node, id, api) {
  const root = api.root(node);
  if (api.attr(root, 'id') === id) return root;
  return descendants(root, api).find((candidate) => api.attr(candidate, 'id') === id) ?? null;
}

function hasExactTabValuePairs(node, api) {
  const tabs = ownedDescendants(node, 'aihio-tab', 'aihio-tabs', api);
  const panels = ownedDescendants(node, 'aihio-tab-panel', 'aihio-tabs', api);
  if (tabs.length === 0 && panels.length === 0) return true;
  if (tabs.length === 0 || panels.length === 0) return false;

  const tabCounts = countAttributeValues(tabs, 'value', api);
  const panelCounts = countAttributeValues(panels, 'value', api);
  if (tabCounts.size !== panelCounts.size) return false;
  for (const [value, count] of tabCounts) {
    if (count !== 1 || panelCounts.get(value) !== 1) return false;
  }
  return [...panelCounts.values()].every((count) => count === 1);
}

function ownedDescendants(node, tag, ownerTag, api) {
  return descendants(node, api).filter(
    (candidate) => api.tag(candidate) === tag && nearestOwner(candidate, ownerTag, api) === node
  );
}

function nearestOwner(node, tag, api) {
  let current = api.parent(node);
  while (current) {
    if (api.tag(current) === tag) return current;
    current = api.parent(current);
  }
  return null;
}

function findAncestor(node, tag, api) {
  return nearestOwner(node, tag, api);
}

function descendants(node, api) {
  const result = [];
  for (const child of api.children(node)) {
    result.push(child, ...descendants(child, api));
  }
  return result;
}

function countAttributeValues(nodes, name, api) {
  const counts = new Map();
  for (const node of nodes) {
    const value = api.attr(node, name) ?? '';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function hasNonEmptyAttribute(node, name, api) {
  return normalizeText(api.attr(node, name)).length > 0;
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
