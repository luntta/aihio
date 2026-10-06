// Authoring mistakes that are not accessibility failures, but leave markup that
// does not do what it says. Shared by the linter (over parsed markup) and the
// dev warnings (over live DOM), through the same node adapter as the a11y
// rules. Each violation carries its own rule id, which the linter reports as
// the issue's ruleId.

export const MARKUP_RULE_IDS = new Set(['boolean-attribute-value', 'cluster-needs-grow', 'table-sortable-header']);

// Values that read as "off" but, on a boolean attribute, switch it on: the
// attribute is on whenever it is present.
const FALSE_LIKE = new Set(['false', '0', 'off', 'no']);

// Flex parents in which a cluster is a content-sized item, so its justify has
// no room to act on unless it grows.
const FLEX_FOOTERS = new Set(['aihio-card-footer', 'aihio-dialog-footer']);

// What other tables call a sortable column. Nothing reads these on a <th>.
const INVENTED_SORT_ATTRIBUTES = ['sortable', 'sort', 'data-sort', 'data-sort-key', 'data-sort-by'];

// Controls a sortable header cannot hold: its content becomes a <button>.
const HEADER_CONTROLS = new Set(['a', 'button', 'input', 'select', 'textarea', 'aihio-button', 'aihio-combobox', 'aihio-input', 'aihio-switch', 'aihio-toggle', 'aihio-dropdown']);

/**
 * @param {object} node
 * @param {Record<string, { type: string }>} attributes - the element's declared attributes
 * @param {object} api - node adapter (tag, parent, attr, hasAttr, ...)
 * @returns {{ ruleId: string, severity: 'error' | 'warn', key: string, message: string, suggestion?: string, node?: object }[]}
 *   `node`, when present, is the descendant the violation is about.
 */
export function collectMarkupRuleViolations(node, attributes, api) {
  const violations = [];

  for (const [name, attr] of Object.entries(attributes ?? {})) {
    if (attr.type !== 'boolean' || !api.hasAttr(node, name)) continue;
    const value = api.attr(node, name) ?? '';
    if (!FALSE_LIKE.has(value.trim().toLowerCase())) continue;

    violations.push({
      ruleId: 'boolean-attribute-value',
      severity: 'error',
      key: `boolean-attribute-value:${name}`,
      message: `${name}="${value}" turns ${name} on: a boolean attribute is on whenever it is present, whatever its value. Remove it for off.`,
    });
  }

  if (api.tag(node) === 'aihio-cluster') {
    const justify = api.attr(node, 'justify');
    const parentTag = api.tag(api.parent(node));
    const footerAlreadyEnds = parentTag === 'aihio-dialog-footer' && justify === 'end';

    if (
      justify &&
      justify !== 'start' &&
      !api.hasAttr(node, 'grow') &&
      FLEX_FOOTERS.has(parentTag) &&
      !footerAlreadyEnds
    ) {
      violations.push({
        ruleId: 'cluster-needs-grow',
        severity: 'warn',
        key: 'cluster-needs-grow',
        message: `justify="${justify}" does nothing here: inside <${parentTag}> the cluster is sized to its content. Add grow so it fills the row.`,
        suggestion: `grow justify="${justify}"`,
      });
    }
  }

  if (api.tag(node) === 'aihio-table' || api.tag(node) === 'aihio-data-grid') {
    violations.push(...collectSortableHeaderViolations(node, api));
  }

  return violations;
}

/**
 * Sorting is turned on per column, with data-sortable on a <th> in <thead>.
 * The other spellings do nothing, and so does data-sortable anywhere else.
 */
function collectSortableHeaderViolations(node, api) {
  const table = api.children(node).find((child) => api.tag(child) === 'table');
  if (!table) return [];

  const violations = [];
  for (const section of api.children(table)) {
    const sectionTag = api.tag(section);
    const rows = sectionTag === 'tr' ? [section] : api.children(section).filter((row) => api.tag(row) === 'tr');

    for (const cell of rows.flatMap((row) => api.children(row))) {
      const cellTag = api.tag(cell);
      if (cellTag !== 'th' && cellTag !== 'td') continue;

      for (const name of INVENTED_SORT_ATTRIBUTES) {
        if (!api.hasAttr(cell, name)) continue;
        const value = (api.attr(cell, name) ?? '').trim();
        const named = value && !['true', 'false', name].includes(value.toLowerCase());
        violations.push({
          ruleId: 'table-sortable-header',
          severity: 'error',
          key: `table-sortable-header:${name}`,
          message: `<${cellTag} ${name}> does nothing: nothing reads ${name}. Write data-sortable on the <th>, and the table makes the header a sort button.`,
          suggestion: named ? `data-sortable="${value}"` : 'data-sortable',
          node: cell,
        });
      }

      if (!api.hasAttr(cell, 'data-sortable')) continue;

      if (cellTag !== 'th' || sectionTag !== 'thead') {
        violations.push({
          ruleId: 'table-sortable-header',
          severity: 'warn',
          key: 'table-sortable-header:placement',
          message: `data-sortable on a <${cellTag}> ${sectionTag === 'thead' ? '' : `in <${sectionTag}> `}does nothing: only a <th> in <thead> sorts the rows.`,
          node: cell,
        });
        continue;
      }

      // An authored <button> as the whole content is adopted as the sort
      // control; any other control would end up inside one.
      const children = api.children(cell);
      const ownButton = children.length === 1 && api.tag(children[0]) === 'button';
      if (!ownButton && hasControl(cell, api)) {
        violations.push({
          ruleId: 'table-sortable-header',
          severity: 'error',
          key: 'table-sortable-header:control',
          message: 'A sortable header\'s content becomes a <button>, which cannot hold another control. Move the control out of the header, or drop data-sortable.',
          node: cell,
        });
      }
    }
  }
  return violations;
}

function hasControl(node, api) {
  return api.children(node).some((child) => HEADER_CONTROLS.has(api.tag(child)) || hasControl(child, api));
}
