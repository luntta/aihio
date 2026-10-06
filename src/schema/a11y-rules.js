export const A11Y_RULE_IDS = new Set([
  'alert-announced-content',
  'alert-role',
  'avatar-alt',
  'avatar-fallback',
  'button-accessible-name',
  'button-form-owner',
  'button-link-attributes',
  'button-link-href',
  'button-link-navigation',
  'card-click-handler',
  'combobox-form-name',
  'combobox-label',
  'combobox-option-values',
  'data-grid-row-count',
  'data-grid-row-limit',
  'dialog-accessible-name',
  'dropdown-trigger-name',
  'field-error-message',
  'field-label',
  'input-label',
  'input-error-description',
  'input-form-name',
  'pagination-href',
  'pagination-label',
  'pagination-pages',
  'switch-form-name',
  'switch-label',
  'switch-state-name',
  'table-accessible-name',
  'table-click-handler',
  'table-header-cells',
  'table-sort-column-name',
  'tabs-value-pairs',
  'toggle-accessible-name',
  'toggle-state-name',
]);

const DATA_GRID_ROW_LIMIT = 350000;

const RULES = {
  'alert-announced-content': (node, api) =>
    api.attr(node, 'variant') === 'destructive' &&
    !hasNamedSlotContent(node, 'title', api) &&
    !hasNamedSlotContent(node, 'description', api),

  // The variant sets the role: alert for destructive, status for the rest. An
  // authored role overrides that, and role="alert" on a confirmation
  // interrupts whatever the screen reader was saying. A role that matches the
  // variant's is the one the component sets itself, so only a different one
  // is reported.
  'alert-role': (node, api) =>
    api.hasAttr(node, 'role') &&
    api.attr(node, 'role') !== (api.attr(node, 'variant') === 'destructive' ? 'alert' : 'status'),

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

  // A click handler on the card is reachable by pointer only. Giving the card
  // a role and a tab stop is the author's way out; a link inside it is better.
  'card-click-handler': (node, api) =>
    CLICK_HANDLER_ATTRIBUTES.some((name) => api.hasAttr(node, name)) &&
    !(['button', 'link'].includes(api.attr(node, 'role')) && api.hasAttr(node, 'tabindex')),

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

  // The grid asks for rows by number, so it has to know how many there are.
  // A count bound by a template is set at runtime.
  'data-grid-row-count': (node, api) =>
    !isBound(node, 'row-count', api) && wholeNumber(api.attr(node, 'row-count')) === null,

  // Firefox stops a box's height at 17.9 million pixels (Chromium and WebKit
  // at 33.5 million), and the scroll ends there: about 389,000 rows of the
  // default height. The limit leaves room for rows a little taller.
  'data-grid-row-limit': (node, api) =>
    (wholeNumber(api.attr(node, 'row-count')) ?? 0) > DATA_GRID_ROW_LIMIT,

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

  // The field sets error itself from slot="error" content. Written by hand
  // with no message, it marks the field invalid with nothing to announce.
  'field-error-message': (node, api) =>
    api.hasAttr(node, 'error') &&
    !descendants(node, api).some(
      (child) =>
        api.attr(child, 'slot') === 'error' &&
        nearestOwner(child, 'aihio-field', api) === node &&
        hasContent(child, api)
    ),

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

  'pagination-href': (node, api) =>
    api.hasAttr(node, 'href') && !String(api.attr(node, 'href')).includes('{page}'),

  // Several unnamed navigation landmarks, or several with one name, cannot be
  // told apart in a screen reader's list of landmarks.
  'pagination-label': (node, api) => {
    const all = descendants(api.root(node), api).filter((candidate) => api.tag(candidate) === 'aihio-pagination');
    if (all.length < 2) return false;
    const name = landmarkName(node, api);
    return !name || all.some((other) => other !== node && landmarkName(other, api) === name);
  },

  // A value bound by a template (:pages="total") is set at runtime, and is
  // not judged here.
  'pagination-pages': (node, api) => {
    if (isBound(node, 'pages', api)) return false;
    const pages = wholeNumber(api.attr(node, 'pages'));
    if (pages === null) return true;
    if (pages < 1 || !api.hasAttr(node, 'page') || isBound(node, 'page', api)) return false;
    const page = wholeNumber(api.attr(node, 'page'));
    return page === null || page < 1 || page > pages;
  },

  'switch-form-name': (node, api) =>
    api.tag(owningForm(node, api)) === 'form' && !hasNonEmptyAttribute(node, 'name', api),

  'switch-label': (node, api) => !hasAssociatedLabel(node, api),

  'switch-state-name': (node, api) => STATE_NAME.test(labelText(node, api)),

  'table-accessible-name': (node, api) => {
    const table = ownTable(node, api);
    if (!table) return false;
    const caption = api.children(table).find((child) => api.tag(child) === 'caption');
    if (caption && normalizeText(api.text(caption)).length > 0) return false;
    return !hasNonEmptyAttribute(table, 'aria-label', api) && !referencesExistingIds(table, 'aria-labelledby', api);
  },

  // A row or cell that holds a link or button already has a keyboard path,
  // so a click handler that widens its target for the pointer is left alone.
  'table-click-handler': (node, api) => {
    const table = ownTable(node, api);
    if (!table) return false;
    const rows = tableRows(table, api);
    return [...rows, ...rows.flatMap((row) => rowCells(row, api))].some(
      (element) =>
        CLICK_HANDLER_ATTRIBUTES.some((name) => api.hasAttr(element, name)) &&
        !descendants(element, api).some((child) => INTERACTIVE_TAGS.has(api.tag(child)))
    );
  },

  // A table with no cells yet, still to be filled by script, is not judged.
  'table-header-cells': (node, api) => {
    const table = ownTable(node, api);
    const cells = table ? tableRows(table, api).flatMap((row) => rowCells(row, api)) : [];
    return cells.length > 0 && cells.every((cell) => api.tag(cell) !== 'th');
  },

  // A grid's rows are always sorted by your code, as manual-sort's are.
  'table-sort-column-name': (node, api) => {
    if (!api.hasAttr(node, 'manual-sort') && api.tag(node) !== 'aihio-data-grid') return false;
    const table = ownTable(node, api);
    return Boolean(table) && headerCells(table, api).some(
      (cell) => api.hasAttr(cell, 'data-sortable') && normalizeText(api.attr(cell, 'data-sortable')).length === 0
    );
  },

  'tabs-value-pairs': (node, api) => !hasExactTabValuePairs(node, api),

  'toggle-accessible-name': (node, api) =>
    requiresExplicitAccessibleName(node, api) && !hasAccessibleName(node, api),

  'toggle-state-name': (node, api) =>
    STATE_NAME.test(normalizeText(api.attr(node, 'aria-label')) || normalizeText(api.text(node))),
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

// Click handlers, including template bindings, which parse as attributes too.
const CLICK_HANDLER_ATTRIBUTES = ['onclick', '@click', 'v-on:click', 'x-on:click'];

// Elements the keyboard reaches on their own.
const INTERACTIVE_TAGS = new Set([
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'aihio-button',
  'aihio-combobox',
  'aihio-input',
  'aihio-switch',
  'aihio-toggle',
]);

// A click handler that changes the page: the shape of a link written as a
// button.
const NAVIGATION_HANDLER_ATTRIBUTES = CLICK_HANDLER_ATTRIBUTES;
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

// A name that only states a state ("On", "Enabled") says nothing about what
// is on: the control already announces its state.
const STATE_NAME = /^(?:on|off|enabled|disabled|yes|no|true|false|active|inactive|checked|unchecked|pressed|unpressed|selected)$/i;

/** The text a form control is named by: aria-label, its field's label, or a wrapping <label>. */
function labelText(node, api) {
  const ariaLabel = normalizeText(api.attr(node, 'aria-label'));
  if (ariaLabel) return ariaLabel;

  const field = findAncestor(node, 'aihio-field', api);
  if (field) {
    const label = descendants(field, api).find(
      (child) => api.attr(child, 'slot') === 'label' && nearestOwner(child, 'aihio-field', api) === field
    );
    return label ? normalizeText(api.text(label)) : '';
  }

  const label = findAncestor(node, 'label', api);
  return label ? normalizeText(api.text(label)) : '';
}

/** What a landmark is called: its aria-label, or the ids it is labelled by. */
function landmarkName(node, api) {
  return normalizeText(api.attr(node, 'aria-label')) || normalizeText(api.attr(node, 'aria-labelledby'));
}

/** Whether a template binds the attribute (:name, v-bind:name, [name], {name}). */
function isBound(node, name, api) {
  return [`:${name}`, `v-bind:${name}`, `[${name}]`, `[attr.${name}]`, `bind:${name}`].some((form) => api.hasAttr(node, form)) ||
    /^\s*\{.*\}\s*$/.test(api.attr(node, name) ?? '');
}

function wholeNumber(value) {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

/** The <table> an aihio-table enhances: its first <table> child. */
function ownTable(node, api) {
  return api.children(node).find((child) => api.tag(child) === 'table') ?? null;
}

/**
 * A table's own rows, in its sections or (for a table built in script)
 * directly under it. Rows of a table nested in a cell belong to that table.
 */
function tableRows(table, api) {
  return api.children(table).flatMap((child) => {
    const tag = api.tag(child);
    if (tag === 'tr') return [child];
    if (tag !== 'thead' && tag !== 'tbody' && tag !== 'tfoot') return [];
    return api.children(child).filter((row) => api.tag(row) === 'tr');
  });
}

function rowCells(row, api) {
  return api.children(row).filter((cell) => api.tag(cell) === 'th' || api.tag(cell) === 'td');
}

function headerCells(table, api) {
  return api.children(table)
    .filter((child) => api.tag(child) === 'thead')
    .flatMap((head) => api.children(head).filter((row) => api.tag(row) === 'tr'))
    .flatMap((row) => rowCells(row, api))
    .filter((cell) => api.tag(cell) === 'th');
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
