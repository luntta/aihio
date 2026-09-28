import { AihioElement } from '../base.js';

/**
 * An on/off setting. It renders a real <input type="checkbox" role="switch">
 * in its own light DOM, so inside a <form> it submits name=value when on and
 * nothing when off, resets with the form, and is disabled by
 * <fieldset disabled> — natively, as a checkbox is.
 *
 * Like aihio-input it holds no label text: name it with aihio-field, a
 * wrapping <label>, or aria-label.
 */
export class AihioSwitch extends AihioElement {
  static tag = 'aihio-switch';
  static schemaVersion = '1.0.0';
  static observedAttributes = [
    'checked',
    'disabled',
    'required',
    'name',
    'value',
    'form',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'aria-invalid',
  ];

  setup() {
    this._input = this.querySelector(':scope > input[type="checkbox"]') ?? document.createElement('input');
    this._input.type = 'checkbox';
    this._input.setAttribute('role', 'switch');

    // As with a native checkbox, the checked attribute is the default (reset)
    // state and the checked property is live state.
    this._input.defaultChecked = this.hasAttribute('checked') || this._input.defaultChecked;
    this._input.checked = this._pendingChecked ?? this._input.defaultChecked;
    this._pendingChecked = undefined;

    this._onChange = () => {
      this.emit('aihio-change', { checked: this._input.checked });
    };
    this._input.addEventListener('change', this._onChange);

    if (this._input.parentNode !== this) {
      this.replaceChildren(this._input);
    }
  }

  syncAttribute(name, _oldValue, newValue) {
    if (name !== 'checked' || !this._input) return;
    this._input.defaultChecked = newValue !== null;
    this._input.checked = newValue !== null;
  }

  sync() {
    const input = this._input;
    if (!input) return;

    input.disabled = this.boolAttr('disabled');
    input.required = this.boolAttr('required');
    for (const name of FORWARDED_ATTRIBUTES) {
      const value = this.getAttribute(name);
      if (value === null) input.removeAttribute(name);
      else if (input.getAttribute(name) !== value) input.setAttribute(name, value);
    }
  }

  /** Live on/off state. The checked attribute is the reset default. */
  get checked() {
    return this._input?.checked ?? this._pendingChecked ?? this.hasAttribute('checked');
  }

  set checked(value) {
    if (this._input) this._input.checked = Boolean(value);
    else this._pendingChecked = Boolean(value);
  }

  get defaultChecked() {
    return this.hasAttribute('checked');
  }

  set defaultChecked(value) {
    this.toggleAttribute('checked', Boolean(value));
  }

  /** The native checkbox this element delegates to. */
  get control() {
    return this._input ?? null;
  }

  /** The form this switch submits to, or null when it is outside one. */
  get form() {
    return this._input?.form ?? null;
  }

  get validity() {
    return this._input?.validity ?? null;
  }

  get validationMessage() {
    return this._input?.validationMessage ?? '';
  }

  get willValidate() {
    return this._input?.willValidate ?? false;
  }

  checkValidity() {
    return this._input?.checkValidity() ?? true;
  }

  reportValidity() {
    return this._input?.reportValidity() ?? true;
  }

  setCustomValidity(message) {
    this._input?.setCustomValidity(String(message ?? ''));
  }

  click() {
    if (this._input) this._input.click();
    else super.click();
  }

  focus(options) {
    if (this._input) this._input.focus(options);
    else super.focus(options);
  }
}

const FORWARDED_ATTRIBUTES = [
  'name',
  'value',
  'form',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-invalid',
];
