import { runtimeSchema } from '../schema/runtime.js';

const schemaByTag = new Map(
  runtimeSchema.components.map((component) => [component.$component, component])
);

const knownTags = new Set(schemaByTag.keys());
for (const component of runtimeSchema.components) {
  for (const related of component.related ?? []) {
    knownTags.add(related.$component);
  }
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const a11yRequirementCheckers = {
  'aihio-alert': {
    'variant="destructive"': (node) =>
      getAttribute(node, 'variant') === 'destructive' &&
      !hasNamedSlotContent(node, 'title') &&
      !hasNamedSlotContent(node, 'description'),
  },
  'aihio-avatar': {
    'src is set': (node) => hasNonEmptyAttribute(node, 'src') && !hasAttribute(node, 'alt'),
    'src is not set and fallback is empty': (node) =>
      !hasNonEmptyAttribute(node, 'src') &&
      normalizeText(getAttribute(node, 'fallback')).length === 0 &&
      normalizeText(getAttribute(node, 'alt')).length === 0,
  },
  'aihio-button': {
    'size="icon" or the button has no visible text': (node, context) =>
      requiresExplicitAccessibleName(node) && !hasAccessibleName(node, context),
  },
  'aihio-dialog': {
    'dialog has no aihio-dialog-title': (node) =>
      !findDescendants(node, (child) => child.tagName === 'aihio-dialog-title').length &&
      !hasNonEmptyAttribute(node, 'aria-label'),
  },
  'aihio-dropdown': {
    'the trigger is icon-only': (node, context) => {
      const trigger = getDropdownTrigger(node);
      return Boolean(trigger && requiresExplicitAccessibleName(trigger) && !hasAccessibleName(trigger, context));
    },
  },
  'aihio-input': {
    'input has no visible <label> associated by for/id': (node, context) => !hasAssociatedLabel(node, context),
    'error=true': (node, context) =>
      hasAttribute(node, 'error') && !referencesExistingIds(node, 'aria-describedby', context),
  },
  'aihio-tabs': {
    'every aihio-tab and aihio-tab-panel': (node) => !hasExactTabValuePairs(node),
  },
  'aihio-toggle': {
    'toggle has no visible text (icon-only)': (node, context) =>
      requiresExplicitAccessibleName(node) && !hasAccessibleName(node, context),
  },
};

export function lintMarkup(markup, options = {}) {
  const source = options.source ?? '<inline>';
  const normalizedMarkup = String(markup ?? '');
  const document = parseMarkup(normalizedMarkup);
  const elements = [...walkElements(document)];
  const context = {
    source,
    ids: indexIds(elements),
    labelsByFor: indexLabelsByFor(elements),
    resolveLocation: createLocationResolver(normalizedMarkup),
  };
  const issues = [];

  for (const node of elements) {
    if (!isAihioTag(node.tagName)) continue;

    if (!knownTags.has(node.tagName)) {
      issues.push(
        createIssue({
          ruleId: 'unknown-component',
          severity: 'error',
          node,
          context,
          message: `unknown Aihio component <${node.tagName}>.`,
        })
      );
      continue;
    }

    const schema = schemaByTag.get(node.tagName);
    if (!schema) continue;

    issues.push(...collectEnumIssues(node, schema, context));
    issues.push(...collectCompositionIssues(node, schema, context));
    issues.push(...collectA11yIssues(node, schema, context));
  }

  return {
    ok: issues.every((issue) => issue.severity !== 'error'),
    source,
    issues,
  };
}

function collectEnumIssues(node, schema, context) {
  const issues = [];

  for (const [name, attr] of Object.entries(schema.attributes ?? {})) {
    if (attr.type !== 'enum') continue;
    if (!hasAttribute(node, name)) continue;

    const value = getAttribute(node, name);
    if (attr.values?.includes(value)) continue;

    issues.push(
      createIssue({
        ruleId: 'invalid-enum-attribute',
        severity: 'error',
        node,
        context,
        message: `invalid ${name}="${value}". Expected one of: ${attr.values.join(', ')}.`,
      })
    );
  }

  return issues;
}

function collectCompositionIssues(node, schema, context) {
  const issues = [];
  const composition = schema.composition ?? {};
  const directChildren = node.children ?? [];
  const directElements = directChildren.filter((child) => child.type === 'element');

  if (Array.isArray(composition.allowedParents) && composition.allowedParents.length > 0) {
    const parentTag = node.parent?.type === 'element' ? node.parent.tagName : null;
    if (!parentTag || !composition.allowedParents.includes(parentTag)) {
      issues.push(
        createIssue({
          ruleId: 'invalid-parent',
          severity: 'error',
          node,
          context,
          message: `parent <${parentTag ?? 'root'}> is not allowed. Expected one of: ${composition.allowedParents.join(', ')}.`,
        })
      );
    }
  }

  for (const ancestorTag of composition.requiredAncestors ?? []) {
    if (hasAncestor(node, ancestorTag)) continue;

    issues.push(
      createIssue({
        ruleId: 'missing-required-ancestor',
        severity: 'error',
        node,
        context,
        message: `missing required ancestor <${ancestorTag}>.`,
      })
    );
  }

  for (const slotName of composition.requiredSlots ?? []) {
    const hasSlot = directElements.some((child) => getAttribute(child, 'slot') === slotName);
    if (hasSlot) continue;

    issues.push(
      createIssue({
        ruleId: 'missing-required-slot',
        severity: 'error',
        node,
        context,
        message: `missing required slot "${slotName}".`,
      })
    );
  }

  if (Array.isArray(composition.allowedSlots)) {
    for (const child of directElements) {
      const slotName = getAttribute(child, 'slot');
      if (!slotName) continue;
      if (composition.allowedSlots.includes(slotName)) continue;

      issues.push(
        createIssue({
          ruleId: 'invalid-slot',
          severity: 'error',
          node: child,
          context,
          message: `slot "${slotName}" is not allowed here. Expected one of: ${composition.allowedSlots.join(', ')}.`,
        })
      );
    }
  }

  for (const token of composition.requiredChildren ?? []) {
    const hasMatch = directChildren.some((child) => matchesCompositionToken(child, token));
    if (hasMatch) continue;

    issues.push(
      createIssue({
        ruleId: 'missing-required-child',
        severity: 'error',
        node,
        context,
        message: `missing required child ${formatCompositionToken(token)}.`,
      })
    );
  }

  if (Array.isArray(composition.allowedChildren)) {
    for (const child of directChildren) {
      if (child.type === 'text' && normalizeText(child.value).length === 0) {
        continue;
      }

      const isAllowed = composition.allowedChildren.some((token) => matchesCompositionToken(child, token));
      if (isAllowed) continue;

      issues.push(
        createIssue({
          ruleId: 'invalid-child',
          severity: 'error',
          node: child.type === 'element' ? child : node,
          context,
          message: `child ${formatNodeLabel(child)} is not allowed here. Expected: ${composition.allowedChildren.join(', ')}.`,
        })
      );
    }
  }

  for (const token of composition.forbiddenChildren ?? []) {
    for (const descendant of findDescendants(node, (child) => matchesCompositionToken(child, token))) {
      issues.push(
        createIssue({
          ruleId: 'forbidden-descendant',
          severity: 'error',
          node: descendant,
          context,
          message: `descendant ${formatNodeLabel(descendant)} is forbidden inside <${node.tagName}>.`,
        })
      );
    }
  }

  return issues;
}

function collectA11yIssues(node, schema, context) {
  const issues = [];
  const checkers = a11yRequirementCheckers[schema.$component];

  if (!checkers) return issues;

  for (const requirement of schema.a11yContract?.required ?? []) {
    const checker = checkers[requirement.when];
    if (!checker) continue;
    if (!checker(node, context, schema)) continue;

    issues.push(
      createIssue({
        ruleId: 'a11y-contract',
        severity: requirement.severity,
        node,
        context,
        message: requirement.requirement,
      })
    );
  }

  return issues;
}

function createIssue({ ruleId, severity, node, context, message }) {
  return {
    ruleId,
    severity,
    component: node?.tagName ?? null,
    message,
    path: node ? getNodePath(node) : 'root',
    location: node ? context.resolveLocation(node.start) : context.resolveLocation(0),
    source: context.source,
  };
}

function parseMarkup(markup) {
  const root = { type: 'root', children: [], parent: null, start: 0, end: markup.length };
  const stack = [root];
  const pattern = /<!--[\s\S]*?-->|<\/?([A-Za-z][A-Za-z0-9:-]*)([^>]*)>/g;
  let lastIndex = 0;

  for (const match of markup.matchAll(pattern)) {
    const raw = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      appendText(stack[stack.length - 1], markup.slice(lastIndex, start), lastIndex, start);
    }

    lastIndex = start + raw.length;

    if (raw.startsWith('<!--')) {
      continue;
    }

    const tagName = match[1].toLowerCase();
    const attrSource = match[2] ?? '';

    if (raw.startsWith('</')) {
      closeElement(stack, tagName, lastIndex);
      continue;
    }

    const node = {
      type: 'element',
      tagName,
      attributes: parseAttributes(attrSource),
      children: [],
      parent: stack[stack.length - 1],
      start,
      end: lastIndex,
    };

    stack[stack.length - 1].children.push(node);

    const selfClosing = raw.endsWith('/>') || VOID_ELEMENTS.has(tagName);
    if (!selfClosing) {
      stack.push(node);
    }
  }

  if (lastIndex < markup.length) {
    appendText(stack[stack.length - 1], markup.slice(lastIndex), lastIndex, markup.length);
  }

  while (stack.length > 1) {
    stack.pop().end = markup.length;
  }

  return root;
}

function parseAttributes(source) {
  const normalized = source.replace(/\/\s*$/, '');
  const attributes = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of normalized.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attributes[name] = value;
  }

  return attributes;
}

function appendText(parent, value, start, end) {
  parent.children.push({
    type: 'text',
    value,
    parent,
    start,
    end,
  });
}

function closeElement(stack, tagName, end) {
  for (let index = stack.length - 1; index > 0; index -= 1) {
    const node = stack[index];
    if (node.tagName !== tagName) continue;

    stack.splice(index);
    node.end = end;
    return;
  }
}

function* walkElements(node) {
  for (const child of node.children ?? []) {
    if (child.type !== 'element') continue;
    yield child;
    yield* walkElements(child);
  }
}

function findDescendants(node, predicate) {
  const matches = [];

  for (const child of walkElements(node)) {
    if (predicate(child)) {
      matches.push(child);
    }
  }

  return matches;
}

function indexIds(elements) {
  const ids = new Map();

  for (const element of elements) {
    const id = getAttribute(element, 'id');
    if (!id) continue;
    ids.set(id, element);
  }

  return ids;
}

function indexLabelsByFor(elements) {
  const labelsByFor = new Map();

  for (const element of elements) {
    if (element.tagName !== 'label') continue;
    const target = getAttribute(element, 'for');
    if (!target) continue;

    const labels = labelsByFor.get(target) ?? [];
    labels.push(element);
    labelsByFor.set(target, labels);
  }

  return labelsByFor;
}

function createLocationResolver(markup) {
  const lineStarts = [0];

  for (let index = 0; index < markup.length; index += 1) {
    if (markup[index] === '\n') {
      lineStarts.push(index + 1);
    }
  }

  return (offset) => {
    let low = 0;
    let high = lineStarts.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStarts[mid] <= offset) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const lineIndex = Math.max(high, 0);
    return {
      offset,
      line: lineIndex + 1,
      column: offset - lineStarts[lineIndex] + 1,
    };
  };
}

function matchesCompositionToken(node, token) {
  if (!token) return false;
  if (token === '*') return true;
  if (token === '#text') {
    return node.type === 'text' && normalizeText(node.value).length > 0;
  }
  if (token === '#flow') {
    if (node.type === 'text') {
      return normalizeText(node.value).length > 0;
    }
    return node.type === 'element' && !isAihioTag(node.tagName);
  }

  return node.type === 'element' && node.tagName === token;
}

function formatCompositionToken(token) {
  if (token.startsWith('#')) return token;
  return `<${token}>`;
}

function formatNodeLabel(node) {
  if (node.type === 'text') return '#text';
  return `<${node.tagName}>`;
}

function getNodePath(node) {
  const parts = [];
  let current = node;

  while (current?.type === 'element') {
    const siblings = (current.parent?.children ?? []).filter(
      (sibling) => sibling.type === 'element' && sibling.tagName === current.tagName
    );
    const position = siblings.indexOf(current) + 1;
    parts.unshift(`${current.tagName}[${position}]`);
    current = current.parent;
  }

  return parts.join(' > ');
}

function hasAncestor(node, tagName) {
  let current = node.parent;

  while (current?.type === 'element') {
    if (current.tagName === tagName) return true;
    current = current.parent;
  }

  return false;
}

function getAttribute(node, name) {
  return Object.prototype.hasOwnProperty.call(node.attributes ?? {}, name)
    ? node.attributes[name]
    : null;
}

function hasAttribute(node, name) {
  return Object.prototype.hasOwnProperty.call(node.attributes ?? {}, name);
}

function hasNonEmptyAttribute(node, name) {
  const value = getAttribute(node, name);
  return typeof value === 'string' && value.trim().length > 0;
}

function getTextContent(node) {
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(getTextContent).join('');
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function isAihioTag(tagName) {
  return typeof tagName === 'string' && tagName.startsWith('aihio-');
}

function referencesExistingIds(node, attrName, context) {
  const raw = getAttribute(node, attrName);
  if (!raw) return false;

  return raw
    .split(/\s+/)
    .filter(Boolean)
    .every((id) => context.ids.has(id));
}

function hasAssociatedLabel(node, context) {
  if (hasNonEmptyAttribute(node, 'aria-label')) return true;
  if (referencesExistingIds(node, 'aria-labelledby', context)) return true;
  if (hasAncestor(node, 'label')) return true;

  const id = getAttribute(node, 'id');
  if (!id) return false;

  return (context.labelsByFor.get(id) ?? []).length > 0;
}

function hasAccessibleName(node, context) {
  return (
    hasNonEmptyAttribute(node, 'aria-label') ||
    referencesExistingIds(node, 'aria-labelledby', context) ||
    normalizeText(getTextContent(node)).length > 0
  );
}

function requiresExplicitAccessibleName(node) {
  return getAttribute(node, 'size') === 'icon' || normalizeText(getTextContent(node)).length === 0;
}

function hasNamedSlotContent(node, slotName) {
  return (node.children ?? [])
    .filter((child) => child.type === 'element' && getAttribute(child, 'slot') === slotName)
    .some((child) => normalizeText(getTextContent(child)).length > 0 || (child.children ?? []).length > 0);
}

function getDropdownTrigger(node) {
  return (node.children ?? []).find(
    (child) => child.type === 'element' && getAttribute(child, 'slot') === 'trigger'
  ) ?? null;
}

function hasExactTabValuePairs(node) {
  const tabs = findDescendants(node, (child) => child.tagName === 'aihio-tab');
  const panels = findDescendants(node, (child) => child.tagName === 'aihio-tab-panel');

  if (tabs.length === 0 && panels.length === 0) return true;
  if (tabs.length === 0 || panels.length === 0) return false;

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
    if (count !== 1) return false;
  }

  return true;
}

function countAttributeValues(nodes, attrName) {
  const counts = new Map();

  for (const node of nodes) {
    const value = getAttribute(node, attrName) ?? '';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}
