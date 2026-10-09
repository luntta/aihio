import { AihioElement } from '../base.js';

let fieldInstanceId = 0;

// Aihio controls come first in document order, ahead of the native inputs
// they render inside themselves, so the host is the control that is found.
const CONTROL_SELECTOR = 'aihio-input, aihio-combobox, aihio-date-picker, aihio-calendar, aihio-switch, input, select, textarea';

// Hosts that take the error state as an attribute and restate it on the
// control they render.
const ERROR_ATTRIBUTE_HOSTS = new Set(['AIHIO-INPUT', 'AIHIO-COMBOBOX', 'AIHIO-DATE-PICKER', 'AIHIO-CALENDAR']);

export class AihioField extends AihioElement {
  static tag = 'aihio-field';
  static schemaVersion = '1.3.0';
  static observedAttributes = ['error'];

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

    if ('error' in control || ERROR_ATTRIBUTE_HOSTS.has(control.tagName)) {
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
    // host is not labelable merely because it contains an input, and a
    // calendar holds no control a label can point at (its input is hidden):
    // aria-labelledby names it, and a click on the label focuses it.
    if (label.tagName === 'LABEL') {
      const labelTarget = control.control ?? control.querySelector?.('input') ?? control;
      if (isLabelable(labelTarget)) {
        if (!labelTarget.id) labelTarget.id = `${control.id}-native`;
        label.setAttribute('for', labelTarget.id);
      } else {
        label.removeAttribute('for');
      }
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

function isLabelable(element) {
  return element.matches?.('button, meter, output, progress, select, textarea, input:not([type="hidden"])') ?? false;
}

function hasContent(node) {
  if (!node) return false;
  return node.textContent.trim().length > 0 || node.childElementCount > 0;
}

function toggleAttr(element, name, on) {
  if (on) element.setAttribute(name, '');
  else element.removeAttribute(name);
}
