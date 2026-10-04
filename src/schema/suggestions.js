// "Did you mean" for the linter and the dev warnings.
//
// A model writing Aihio markup brings the vocabulary of every other design
// system with it: variant="primary", <aihio-modal>, color="danger". The tables
// below map that vocabulary onto Aihio's; an edit-distance match catches plain
// typos. A suggestion is only ever returned when it names something the schema
// really declares, so the tables can be generous without pointing at a dead
// end — and an issue that carries one can be fixed in a single round trip.

const VALUE_SYNONYMS = {
  primary: 'default',
  solid: 'default',
  filled: 'default',
  info: 'default',
  neutral: 'default',
  danger: 'destructive',
  error: 'destructive',
  negative: 'destructive',
  critical: 'destructive',
  positive: 'success',
  caution: 'warning',
  warn: 'warning',
  tertiary: 'ghost',
  subtle: 'ghost',
  text: 'ghost',
  quiet: 'ghost',
  plain: 'ghost',
  bordered: 'outline',
  outlined: 'outline',
  xs: 'sm',
  small: 'sm',
  medium: 'md',
  normal: 'md',
  large: 'lg',
  xl: 'lg',
  left: 'start',
  top: 'start',
  right: 'end',
  bottom: 'end',
  'flex-start': 'start',
  'flex-end': 'end',
  'space-between': 'between',
};

const COMPONENT_SYNONYMS = {
  'aihio-modal': 'aihio-dialog',
  'aihio-popup': 'aihio-dialog',
  'aihio-sheet': 'aihio-dialog',
  'aihio-drawer': 'aihio-dialog',
  'aihio-alert-dialog': 'aihio-dialog',
  'aihio-menu': 'aihio-dropdown',
  'aihio-dropdown-menu': 'aihio-dropdown',
  'aihio-menu-button': 'aihio-dropdown',
  'aihio-menu-item': 'aihio-dropdown-item',
  'aihio-menuitem': 'aihio-dropdown-item',
  'aihio-dropdown-option': 'aihio-dropdown-item',
  'aihio-divider': 'aihio-dropdown-separator',
  'aihio-select': 'aihio-combobox',
  'aihio-autocomplete': 'aihio-combobox',
  'aihio-listbox': 'aihio-combobox',
  'aihio-typeahead': 'aihio-combobox',
  'aihio-select-option': 'aihio-option',
  'aihio-text-field': 'aihio-input',
  'aihio-textfield': 'aihio-input',
  'aihio-text-input': 'aihio-input',
  'aihio-form-field': 'aihio-field',
  'aihio-form-item': 'aihio-field',
  'aihio-form-control': 'aihio-field',
  'aihio-tag': 'aihio-badge',
  'aihio-chip': 'aihio-badge',
  'aihio-pill': 'aihio-badge',
  'aihio-label': '<label>',
  'aihio-callout': 'aihio-alert',
  'aihio-banner': 'aihio-alert',
  'aihio-toast': 'aihio-alert',
  'aihio-notification': 'aihio-alert',
  'aihio-message': 'aihio-alert',
  'aihio-tab-group': 'aihio-tabs',
  'aihio-tab-panels': 'aihio-tabs',
  'aihio-tabpanel': 'aihio-tab-panel',
  'aihio-panel': 'aihio-card',
  'aihio-columns': 'aihio-grid',
  'aihio-card-grid': 'aihio-grid',
  'aihio-vstack': 'aihio-stack',
  'aihio-column': 'aihio-stack',
  'aihio-hstack': 'aihio-cluster',
  'aihio-row': 'aihio-cluster',
  'aihio-inline': 'aihio-cluster',
  'aihio-button-group': 'aihio-cluster',
  'aihio-toggle-button': 'aihio-toggle',
  'aihio-toggle-switch': 'aihio-switch',
  'aihio-icon-button': 'aihio-button',
  'aihio-link-button': 'aihio-button',
  'aihio-link': '<a>',
  'aihio-anchor': '<a>',
  'aihio-textarea': '<textarea>',
  'aihio-checkbox': '<input type="checkbox">',
  'aihio-radio': '<input type="radio">',
};

const ATTRIBUTE_SYNONYMS = {
  color: 'variant',
  kind: 'variant',
  appearance: 'variant',
  theme: 'variant',
  tone: 'variant',
  severity: 'variant',
  status: 'variant',
  intent: 'variant',
  spacing: 'gap',
  space: 'gap',
  'align-items': 'align',
  'justify-content': 'justify',
  placement: 'align',
  position: 'align',
  busy: 'loading',
  'is-loading': 'loading',
  invalid: 'error',
  'has-error': 'error',
  checked: 'pressed',
  active: 'pressed',
  'default-value': 'value',
  defaultvalue: 'value',
  visible: 'open',
  show: 'open',
  expanded: 'open',
  'is-open': 'open',
  image: 'src',
  initials: 'fallback',
  'target-id': 'commandfor',
  controls: 'commandfor',
};

const COMMAND_SYNONYMS = {
  'show-modal': '--open',
  'show-popover': '--open',
  show: '--open',
  'hide-popover': '--close',
  'request-close': '--close',
  hide: '--close',
  'toggle-popover': '--toggle',
};

/** Closest allowed enum value to `value`, or null. */
export function suggestEnumValue(value, allowed) {
  const normalized = String(value ?? '').trim().toLowerCase();
  const synonym = VALUE_SYNONYMS[normalized];
  if (synonym && allowed.includes(synonym)) return synonym;
  return closest(normalized, allowed);
}

/**
 * Replacement for an unknown aihio-* tag: a known Aihio tag, or native markup
 * such as `<textarea>` where Aihio defers to the platform. Null when nothing
 * fits.
 */
export function suggestComponent(tag, knownTags) {
  const synonym = COMPONENT_SYNONYMS[tag];
  if (synonym && (synonym.startsWith('<') || knownTags.has(synonym))) return synonym;
  return closest(tag, [...knownTags]);
}

/** Declared attribute an unknown `name` most likely meant, or null. */
export function suggestAttribute(name, declared) {
  const synonym = ATTRIBUTE_SYNONYMS[name];
  if (synonym && declared.includes(synonym)) return synonym;
  return closest(name, declared);
}

/** Accepted command a rejected `command` most likely meant, or null. */
export function suggestCommand(command, accepted) {
  const normalized = String(command ?? '').trim().toLowerCase();
  const candidates = [COMMAND_SYNONYMS[normalized], `--${normalized}`];
  const match = candidates.find((candidate) => candidate && accepted.includes(candidate));
  return match ?? closest(normalized, accepted);
}

/* Within a couple of edits, and never so far that the suggestion is a
   different word: short names get one edit, longer ones two. */
function closest(word, candidates) {
  const limit = word.length <= 4 ? 1 : 2;
  let best = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = editDistance(word, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return bestDistance <= limit ? best : null;
}

function editDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1);
      current.push(Math.min(previous[column] + 1, current[column - 1] + 1, substitution));
    }
    previous = current;
  }
  return previous[right.length];
}
