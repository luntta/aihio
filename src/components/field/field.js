import { AihioElement } from '../base.js';

let fieldInstanceId = 0;

const CONTROL_SELECTOR = 'aihio-input, input, select, textarea';

export class AihioField extends AihioElement {
  static tag = 'aihio-field';
  static schemaVersion = '1.1.0';
  static observedAttributes = ['error'];
  static styles = `
    aihio-field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-intent-form-field-gap);
    }

    aihio-field [slot="label"] {
      font-size: var(--fontSize-intent-control-sm);
      font-weight: var(--fontWeight-intent-control);
      line-height: var(--lineHeight-intent-compact);
      color: oklch(var(--color-intent-page-fg));
    }

    aihio-field [slot="description"] {
      font-size: var(--fontSize-intent-body-sm);
      line-height: var(--lineHeight-intent-body);
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    aihio-field [slot="error"] {
      font-size: var(--fontSize-intent-body-sm);
      line-height: var(--lineHeight-intent-body);
      color: oklch(var(--color-intent-state-destructive-text));
    }

    /* The description is redundant once an error is showing: the error message
       supersedes it, and stacking both buries the thing the user must act on. */
    aihio-field[error] [slot="description"] {
      display: none;
    }
  `;

  setup() {
    this._fieldId = ++fieldInstanceId;
    this._observer = new MutationObserver(() => this.refresh());
    this._onClick = (event) => {
      const label = event.target?.closest?.('[slot="label"]');
      if (!label || label.closest('aihio-field') !== this) return;
      if (event.target?.closest?.('a, button, input, select, textarea, [role="button"]')) return;
      this._getControl()?.focus?.({ preventScroll: true });
    };
    this.addEventListener('click', this._onClick);
  }

  connect() {
    this._observer?.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot', 'id'],
    });
  }

  disconnect() {
    this._observer?.disconnect();
  }

  _getControl() {
    return [...this.querySelectorAll(CONTROL_SELECTOR)].find(
      (control) => control.closest('aihio-field') === this
    ) ?? null;
  }

  _getOwnedSlot(name) {
    return [...this.querySelectorAll(`[slot="${name}"]`)].find(
      (element) => element.closest('aihio-field') === this
    ) ?? null;
  }

  sync() {
    const control = this._getControl();
    if (!control) return;

    const label = this._getOwnedSlot('label');
    const description = this._getOwnedSlot('description');
    const error = this._getOwnedSlot('error');

    // An error slot with content is what puts the field in its error state, so
    // authors write the message and nothing else.
    const hasError = hasContent(error);
    this.setBoolAttr('error', hasError);

    if (!control.id) control.id = `aihio-field-${this._fieldId}-control`;

    this._wireLabel(label, control);
    this._wireDescription({ control, description, error, hasError });

    if ('error' in control || control.tagName === 'AIHIO-INPUT') {
      toggleAttr(control, 'error', hasError);
    } else {
      control.setAttribute('aria-invalid', String(hasError));
    }
  }

  _wireLabel(label, control) {
    if (!hasContent(label)) {
      control.removeAttribute('aria-labelledby');
      return;
    }

    if (!label.id) label.id = `aihio-field-${this._fieldId}-label`;

    // Point a native label at the actual labelable control. A custom-element
    // host is not labelable merely because it contains an input.
    if (label.tagName === 'LABEL') {
      const labelTarget = control.control ?? control.querySelector?.('input') ?? control;
      if (!labelTarget.id) labelTarget.id = `${control.id}-native`;
      label.setAttribute('for', labelTarget.id);
    }

    control.setAttribute('aria-labelledby', label.id);
  }

  _wireDescription({ control, description, error, hasError }) {
    const ids = [];

    if (hasError && hasContent(error)) {
      if (!error.id) error.id = `aihio-field-${this._fieldId}-error`;
      ids.push(error.id);
    } else if (hasContent(description)) {
      if (!description.id) description.id = `aihio-field-${this._fieldId}-description`;
      ids.push(description.id);
    }

    if (ids.length === 0) {
      control.removeAttribute('aria-describedby');
      return;
    }

    control.setAttribute('aria-describedby', ids.join(' '));
  }
}

function hasContent(node) {
  if (!node) return false;
  return node.textContent.trim().length > 0 || node.childElementCount > 0;
}

function toggleAttr(element, name, on) {
  if (on) element.setAttribute(name, '');
  else element.removeAttribute(name);
}
