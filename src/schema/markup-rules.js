// Authoring mistakes that are not accessibility failures, but leave markup that
// does not do what it says. Shared by the linter (over parsed markup) and the
// dev warnings (over live DOM), through the same node adapter as the a11y
// rules. Each violation carries its own rule id, which the linter reports as
// the issue's ruleId.

export const MARKUP_RULE_IDS = new Set(['boolean-attribute-value', 'cluster-needs-grow']);

// Values that read as "off" but, on a boolean attribute, switch it on: the
// attribute is on whenever it is present.
const FALSE_LIKE = new Set(['false', '0', 'off', 'no']);

// Flex parents in which a cluster is a content-sized item, so its justify has
// no room to act on unless it grows.
const FLEX_FOOTERS = new Set(['aihio-card-footer', 'aihio-dialog-footer']);

/**
 * @param {object} node
 * @param {Record<string, { type: string }>} attributes - the element's declared attributes
 * @param {object} api - node adapter (tag, parent, attr, hasAttr, ...)
 * @returns {{ ruleId: string, severity: 'error' | 'warn', key: string, message: string, suggestion?: string }[]}
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

  return violations;
}
