import { runtimeSchema } from '../schema/runtime.js';
import { collectA11yRuleViolations } from '../schema/a11y-rules.js';
import { findCommandProblem } from '../schema/command-rules.js';
import { parseFragment } from 'parse5';

const schemaByTag = new Map(
  runtimeSchema.components.map((component) => [component.$component, component])
);

const intentVocabulary = new Set(runtimeSchema.intents ?? []);

const knownTags = new Set(schemaByTag.keys());
for (const component of runtimeSchema.components) {
  for (const related of component.related ?? []) {
    knownTags.add(related.$component);
  }
}

export function lintMarkup(markup, options = {}) {
  const source = options.source ?? '<inline>';
  const normalizedMarkup = String(markup ?? '');
  const document = parseMarkup(normalizedMarkup);
  const elements = [...walkElements(document)];
  const context = {
    source,
    resolveLocation: createLocationResolver(normalizedMarkup),
  };
  const issues = [];

  const elementsById = new Map();
  for (const node of elements) {
    const id = getAttribute(node, 'id');
    if (id && !elementsById.has(id)) elementsById.set(id, node);
  }

  for (const node of elements) {
    issues.push(...collectCommandIssues(node, elementsById, context));

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

    // Sub-components such as aihio-tab and aihio-dropdown-item have no schema
    // entry of their own, so they fall through the check below. An intent
    // annotation on one is still worth checking against the vocabulary, which
    // is why this runs first.
    issues.push(...collectIntentIssues(node, schema, context));

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
  return collectA11yRuleViolations(node, schema, astAdapter).map((requirement) =>
    createIssue({
      ruleId: 'a11y-contract',
      severity: requirement.severity,
      node,
      context,
      message: requirement.requirement,
    })
  );
}

/*
 * data-aihio-intent states what role an element is playing, and the schema is
 * what decides whether it can play it. The build enforces this over the seeded
 * pattern library; this is the same pair of rules applied to author markup, so
 * an annotation cannot quietly claim something the component never offered.
 */
function collectIntentIssues(node, schema, context) {
  const issues = [];
  const annotation = getAttribute(node, 'data-aihio-intent');

  if (annotation === null) return issues;

  for (const intent of String(annotation).split(/\s+/).filter(Boolean)) {
    if (!intentVocabulary.has(intent)) {
      issues.push(
        createIssue({
          ruleId: 'unknown-intent',
          severity: 'error',
          node,
          context,
          message: `data-aihio-intent "${intent}" is not one of the ${intentVocabulary.size} intents in the vocabulary.`,
        })
      );
      continue;
    }

    if (schema && !(schema.intents ?? []).includes(intent)) {
      issues.push(
        createIssue({
          ruleId: 'intent-mismatch',
          severity: 'error',
          node,
          context,
          message: `<${node.tagName}> is annotated data-aihio-intent="${intent}", but its schema declares ${(schema.intents ?? []).join(', ')}.`,
        })
      );
    }
  }

  return issues;
}

function collectCommandIssues(node, elementsById, context) {
  const commandFor = getAttribute(node, 'commandfor');
  const target = commandFor ? elementsById.get(commandFor) ?? null : null;
  const problem = findCommandProblem({
    sourceTag: node.tagName,
    command: getAttribute(node, 'command'),
    commandFor,
    targetTag: target?.tagName ?? null,
    acceptedCommands: schemaByTag.get(target?.tagName)?.commands ?? [],
  });
  if (!problem) return [];

  return [
    createIssue({ ruleId: 'invalid-command', severity: problem.severity, node, context, message: problem.message }),
  ];
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
  const fragment = parseFragment(markup, { sourceCodeLocationInfo: true });
  for (const child of fragment.childNodes ?? []) appendParsedNode(child, root, markup.length);
  return root;
}

function appendParsedNode(parsed, parent, sourceLength) {
  if (parsed.nodeName === '#comment') return;
  const location = parsed.sourceCodeLocation;

  if (parsed.nodeName === '#text') {
    parent.children.push({
      type: 'text',
      value: parsed.value ?? '',
      parent,
      start: location?.startOffset ?? parent.start,
      end: location?.endOffset ?? parent.end,
    });
    return;
  }

  if (!parsed.tagName) return;
  const node = {
    type: 'element',
    tagName: parsed.tagName.toLowerCase(),
    attributes: Object.fromEntries(
      (parsed.attrs ?? []).map(({ name, value }) => [name.toLowerCase(), value])
    ),
    children: [],
    parent,
    start: location?.startOffset ?? 0,
    end: location?.endOffset ?? sourceLength,
  };
  parent.children.push(node);

  const childNodes = parsed.tagName === 'template'
    ? parsed.content?.childNodes ?? []
    : parsed.childNodes ?? [];
  for (const child of childNodes) appendParsedNode(child, node, sourceLength);
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
  return getAncestor(node, tagName) !== null;
}

function getAncestor(node, tagName) {
  let current = node.parent;

  while (current?.type === 'element') {
    if (current.tagName === tagName) return current;
    current = current.parent;
  }

  return null;
}

function getAttribute(node, name) {
  return Object.prototype.hasOwnProperty.call(node.attributes ?? {}, name)
    ? node.attributes[name]
    : null;
}

function hasAttribute(node, name) {
  return Object.prototype.hasOwnProperty.call(node.attributes ?? {}, name);
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

const astAdapter = {
  tag: (node) => node?.type === 'element' ? node.tagName : null,
  children: (node) => (node?.children ?? []).filter((child) => child.type === 'element'),
  parent: (node) => node?.parent ?? null,
  attr: getAttribute,
  hasAttr: hasAttribute,
  text: getTextContent,
  root: (node) => {
    let current = node;
    while (current?.parent) current = current.parent;
    return current;
  },
};
