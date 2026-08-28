import { AihioElement } from '../base.js';

let fieldInstanceId = 0;

const CONTROL_SELECTOR = 'aihio-input, input, select, textarea';

export class AihioField extends AihioElement {
  static tag = 'aihio-field';
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
  }

  sync() {
    const control = this.querySelector(CONTROL_SELECTOR);
    if (!control) return;

    const label = this.querySelector('[slot="label"]');
    const description = this.querySelector('[slot="description"]');
    const error = this.querySelector('[slot="error"]');

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

    // A real <label> also gives click-to-focus, so wire `for` when we can and
    // fall back to aria-labelledby for any other element.
    if (label.tagName === 'LABEL') {
      label.setAttribute('for', control.id);
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
