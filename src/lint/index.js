import { runtimeSchema } from '../schema/runtime.js';
import { collectA11yRuleViolations } from '../schema/a11y-rules.js';
import { findCommandProblem } from '../schema/command-rules.js';
import { collectMarkupRuleViolations } from '../schema/markup-rules.js';
import { suggestAttribute, suggestComponent, suggestEnumValue } from '../schema/suggestions.js';
import { parseFragment } from 'parse5';

/** Every ruleId an issue can carry. a11y-contract issues name their rule in `contract`. */
export const LINT_RULE_IDS = new Set([
  'unknown-component',
  'invalid-enum-attribute',
  'invalid-parent',
  'missing-required-ancestor',
  'missing-required-slot',
  'invalid-slot',
  'missing-required-child',
  'invalid-child',
  'forbidden-descendant',
  'a11y-contract',
  'unknown-intent',
  'intent-mismatch',
  'invalid-command',
  'unknown-attribute',
  'boolean-attribute-value',
  'cluster-needs-grow',
  'table-sortable-header',
  'hand-rolled-layout',
]);

const schemaByTag = new Map(
  runtimeSchema.components.map((component) => [component.$component, component])
);

const intentVocabulary = new Set(runtimeSchema.intents ?? []);

const knownTags = new Set(schemaByTag.keys());
const attributesByTag = new Map();
for (const component of runtimeSchema.components) {
  attributesByTag.set(component.$component, component.attributes ?? {});
  for (const related of component.related ?? []) {
    knownTags.add(related.$component);
    attributesByTag.set(related.$component, related.attributes ?? {});
  }
}
const declaredAttributesByTag = new Map(
  [...attributesByTag].map(([tag, attributes]) => [tag, Object.keys(attributes)])
);

// Attributes any element may carry. Everything else on an Aihio element has to
// be declared by its schema: an invented one is not an error the browser
// reports, it is an attribute nothing reads.
const GLOBAL_ATTRIBUTES = new Set([
  'accesskey',
  'autocapitalize',
  'autocorrect',
  'autofocus',
  'class',
  'contenteditable',
  'dir',
  'draggable',
  'enterkeyhint',
  'exportparts',
  'hidden',
  'id',
  'inert',
  'inputmode',
  'is',
  'itemid',
  'itemprop',
  'itemref',
  'itemscope',
  'itemtype',
  'lang',
  'nonce',
  'part',
  'popover',
  'role',
  'slot',
  'spellcheck',
  'style',
  'tabindex',
  'title',
  'translate',
  'writingsuggestions',
]);

// Template syntax that parses as an attribute. Names with :, @, ., or
// brackets (Vue, Alpine, Svelte, Angular bindings) never reach the check,
// because only plain attribute names are held to the schema.
const FRAMEWORK_ATTRIBUTES = new Set(['key', 'ref']);
const FRAMEWORK_PREFIXES = ['v-', 'x-', 'hx-', 'ng-'];
const PLAIN_ATTRIBUTE_NAME = /^[a-z][a-z0-9-]*$/;

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

    if (!isAihioTag(node.tagName)) {
      issues.push(...collectLayoutIssues(node, context));
      continue;
    }

    if (!knownTags.has(node.tagName)) {
      const match = suggestComponent(node.tagName, knownTags);
      const suggestion = match && (match.startsWith('<') ? match : `<${match}>`);
      issues.push(
        createIssue({
          ruleId: 'unknown-component',
          severity: 'error',
          node,
          context,
          message: `unknown Aihio component <${node.tagName}>.${suggestion ? ` Use ${suggestion} instead.` : ''}`,
          suggestion,
        })
      );
      continue;
    }

    issues.push(...collectUnknownAttributeIssues(node, context));

    const schema = schemaByTag.get(node.tagName);

    // Sub-components such as aihio-tab and aihio-dropdown-item have no schema
    // entry of their own, so they fall through the check below. An intent
    // annotation on one is still worth checking against the vocabulary, which
    // is why this runs first.
    issues.push(...collectIntentIssues(node, schema, context));
    issues.push(...collectMarkupIssues(node, context));

    if (!schema) continue;

    issues.push(...collectEnumIssues(node, schema, context));
    issues.push(...collectNativeElementIssues(node, schema, context));
    issues.push(...collectCompositionIssues(node, schema, context));
    issues.push(...collectA11yIssues(node, schema, context));
  }

  return {
    ok: issues.every((issue) => issue.severity !== 'error'),
    source,
    issues,
  };
}

function collectEnumIssues(node, schema, context, attributes = schema.attributes) {
  const issues = [];

  for (const [name, attr] of Object.entries(attributes ?? {})) {
    if (attr.type !== 'enum') continue;
    if (!hasAttribute(node, name)) continue;

    const value = getAttribute(node, name);
    if (attr.values?.includes(value)) continue;

    const suggestion = suggestEnumValue(value, attr.values);
    issues.push(
      createIssue({
        ruleId: 'invalid-enum-attribute',
        severity: 'error',
        node,
        context,
        message: `invalid ${name}="${value}". ${suggestion ? `Use ${name}="${suggestion}". ` : ''}Expected one of: ${attr.values.join(', ')}.`,
        suggestion: suggestion ? `${name}="${suggestion}"` : null,
      })
    );
  }

  return issues;
}

/*
 * The native elements a component enhances (a <th> in aihio-table) carry
 * attributes it reads, so they are held to the same enum and boolean rules as
 * its own. Only elements the component owns are checked: those with no other
 * Aihio element between them and it.
 */
function collectNativeElementIssues(node, schema, context) {
  const issues = [];

  for (const [tag, element] of Object.entries(schema.nativeElements ?? {})) {
    const attributes = element.attributes ?? {};
    const owned = findDescendants(node, (child) => child.tagName === tag && nearestAihioAncestor(child) === node);

    for (const child of owned) {
      issues.push(...collectEnumIssues(child, schema, context, attributes));
      issues.push(...collectMarkupIssues(child, context, attributes));
    }
  }

  return issues;
}

function nearestAihioAncestor(node) {
  let current = node.parent;
  while (current?.type === 'element') {
    if (isAihioTag(current.tagName)) return current;
    current = current.parent;
  }
  return null;
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
      contract: requirement.rule,
      severity: requirement.severity,
      node,
      context,
      message: requirement.requirement,
    })
  );
}

function collectMarkupIssues(node, context, attributes = attributesByTag.get(node.tagName)) {
  return collectMarkupRuleViolations(node, attributes, astAdapter).map((violation) =>
    createIssue({
      ruleId: violation.ruleId,
      severity: violation.severity,
      node: violation.node ?? node,
      context,
      message: violation.message,
      suggestion: violation.suggestion,
    })
  );
}

/*
 * Layout written as an inline style, which is the shape a model reaches for
 * when it forgets the layout primitives: it spaces from raw values instead of
 * the token scale, and a fixed column count squeezes on a narrow screen.
 * Stylesheet layout is invisible here, so only inline styles are read.
 */
function collectLayoutIssues(node, context) {
  const style = String(getAttribute(node, 'style') ?? '').toLowerCase().replace(/\s+/g, '');
  const display = style.match(/(?:^|;)display:(grid|inline-grid|flex|inline-flex)(?:;|!|$)/)?.[1];
  if (!display) return [];

  const isGrid = display.endsWith('grid');
  const suggestion = isGrid
    ? '<aihio-grid>'
    : /(?:^|;)flex-direction:column/.test(style) ? '<aihio-stack>' : '<aihio-cluster>';

  return [
    createIssue({
      ruleId: 'hand-rolled-layout',
      severity: 'warn',
      node,
      context,
      message: `<${node.tagName}> lays out its children with an inline display: ${display}. Use ${suggestion}, which spaces them from the token scale${isGrid ? ' and drops columns as it narrows' : ''}.`,
      suggestion,
    }),
  ];
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

// Link attributes written on aihio-button, the shape other design systems use
// for a button that navigates (<sl-button href>, <Button to>). One issue
// covers all of them, and its suggestion is the link the button should wrap.
const BUTTON_LINK_ATTRIBUTES = ['href', 'to', 'target', 'rel', 'download', 'hreflang', 'referrerpolicy'];

function collectUnknownAttributeIssues(node, context) {
  const declared = declaredAttributesByTag.get(node.tagName) ?? [];
  const issues = [];
  const linkTarget = node.tagName === 'aihio-button'
    ? getAttribute(node, 'href') ?? getAttribute(node, 'to')
    : null;

  if (linkTarget !== null) {
    const suggestion = toLinkButtonMarkup(node, linkTarget);
    issues.push(
      createIssue({
        ruleId: 'unknown-attribute',
        severity: 'error',
        node,
        context,
        message: `<aihio-button> has no attribute "${hasAttribute(node, 'href') ? 'href' : 'to'}": a button does not navigate. Put the link inside it, and it becomes the control, styled as the button: ${suggestion}`,
        suggestion,
      })
    );
  }

  for (const name of Object.keys(node.attributes ?? {})) {
    if (declared.includes(name) || isUniversalAttribute(name)) continue;
    if (linkTarget !== null && BUTTON_LINK_ATTRIBUTES.includes(name)) continue;

    const suggestion = suggestAttribute(name, declared);
    const accepts = declared.length > 0 ? `It accepts: ${declared.join(', ')}.` : 'It declares no attributes of its own.';
    issues.push(
      createIssue({
        ruleId: 'unknown-attribute',
        severity: 'error',
        node,
        context,
        message: `<${node.tagName}> has no attribute "${name}".${suggestion ? ` Use ${suggestion} instead.` : ''} ${accepts}`,
        suggestion,
      })
    );
  }

  return issues;
}

function toLinkButtonMarkup(node, href) {
  const hostAttributes = [];
  const linkAttributes = [`href="${escapeAttribute(href)}"`];
  for (const [name, value] of Object.entries(node.attributes ?? {})) {
    if (name === 'href' || name === 'to') continue;
    const formatted = value === '' ? name : `${name}="${escapeAttribute(value)}"`;
    if (BUTTON_LINK_ATTRIBUTES.includes(name)) linkAttributes.push(formatted);
    else hostAttributes.push(formatted);
  }
  const host = ['aihio-button', ...hostAttributes].join(' ');
  return `<${host}><a ${linkAttributes.join(' ')}>${normalizeText(getTextContent(node))}</a></aihio-button>`;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function isUniversalAttribute(name) {
  if (!PLAIN_ATTRIBUTE_NAME.test(name)) return true;
  if (GLOBAL_ATTRIBUTES.has(name) || FRAMEWORK_ATTRIBUTES.has(name)) return true;
  if (name.startsWith('aria-') || name.startsWith('data-')) return true;
  if (name.startsWith('on')) return true;
  return FRAMEWORK_PREFIXES.some((prefix) => name.startsWith(prefix));
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
    createIssue({
      ruleId: 'invalid-command',
      severity: problem.severity,
      node,
      context,
      message: problem.message,
      suggestion: problem.suggestion,
    }),
  ];
}

/*
 * `suggestion` is the replacement for the offending tag, attribute, or value,
 * written as markup (`variant="default"`, `<aihio-dialog>`), present only when
 * the fix is unambiguous enough to apply without reading the message.
 */
function createIssue({ ruleId, severity, node, context, message, suggestion = null, contract = null }) {
  return {
    ruleId,
    ...(contract ? { contract } : {}),
    severity,
    component: node?.tagName ?? null,
    message,
    ...(suggestion ? { suggestion } : {}),
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
