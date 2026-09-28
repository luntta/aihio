import { AihioElement } from '../base.js';

export class AihioInput extends AihioElement {
  static tag = 'aihio-input';
  static schemaVersion = '1.2.0';
  static observedAttributes = [
    'type',
    'size',
    'placeholder',
    'disabled',
    'error',
    'value',
    'name',
    'required',
    'readonly',
    'autocomplete',
    'min',
    'max',
    'minlength',
    'maxlength',
    'pattern',
    'step',
    'inputmode',
    'enterkeyhint',
    'autocapitalize',
    'spellcheck',
    'multiple',
    'accept',
    'capture',
    'list',
    'form',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
  ];

  setup() {
    this._input = this.querySelector('input') ?? document.createElement('input');
    this._form = null;

    // As with a native input, the `value` attribute is the reset default while
    // the property carries live state. Never mirror typing into markup: apart
    // from breaking reset semantics, doing so can serialize private values.
    const authoredDefault = this.getAttribute('value') ?? this._input.getAttribute('value') ?? '';
    this._input.defaultValue = authoredDefault;
    if (this._pendingValue !== undefined) {
      this._input.value = this._pendingValue;
      this._pendingValue = undefined;
    } else {
      this._input.value = authoredDefault;
    }

    this._onReset = () => {
      // The reset event fires before native controls reset. No host attribute
      // is touched: value is live state, while the attribute is defaultValue.
      queueMicrotask(() => this.emit('aihio-input', { value: this.value }));
    };

    this._onInput = () => {
      this.emit('aihio-input', { value: this._input.value });
    };

    this._onChange = () => {
      this.emit('aihio-change', { value: this._input.value });
    };

    this._input.addEventListener('input', this._onInput);
    this._input.addEventListener('change', this._onChange);

    if (!this.contains(this._input)) {
      this.replaceChildren(this._input);
    }
  }

  disconnect() {
    this._detachForm();
  }

  syncAttribute(name, _oldValue, newValue) {
    if (name !== 'value' || !this._input) return;
    const value = newValue ?? '';
    this._input.defaultValue = value;
    this._input.value = value;
  }

  _syncFormListener() {
    const form = this._input?.form ?? null;
    if (form === this._form) return;

    this._detachForm();
    this._form = form;
    this._form?.addEventListener('reset', this._onReset);
  }

  _detachForm() {
    this._form?.removeEventListener('reset', this._onReset);
    this._form = null;
  }

  sync() {
    if (!this._input) return;

    const type = this.attr('type', 'text');
    const placeholder = this.attr('placeholder', '');
    const disabled = this.boolAttr('disabled');
    const error = this.boolAttr('error');
    const required = this.boolAttr('required');
    const readOnly = this.boolAttr('readonly');

    if (this._input.type !== type) this._input.type = type;
    if (this._input.placeholder !== placeholder) this._input.placeholder = placeholder;
    if (this._input.disabled !== disabled) this._input.disabled = disabled;
    if (this._input.required !== required) this._input.required = required;
    if (this._input.readOnly !== readOnly) this._input.readOnly = readOnly;

    // The inner <input> is real light DOM inside the author's <form>, so
    // forwarding name/autocomplete is all that form submission needs — no
    // ElementInternals, no value shadowing.
    for (const name of FORWARDED_ATTRIBUTES) {
      syncAttribute(this, this._input, name);
    }

    this._input.setAttribute('aria-invalid', String(error));

    syncAttribute(this, this._input, 'aria-label');
    syncAttribute(this, this._input, 'aria-labelledby');
    syncAttribute(this, this._input, 'aria-describedby');

    this._syncFormListener();
  }

  get value() {
    return this._input?.value ?? '';
  }

  set value(v) {
    const value = String(v ?? '');
    if (this._input) this._input.value = value;
    else this._pendingValue = value;
  }

  get defaultValue() {
    return this.getAttribute('value') ?? '';
  }

  set defaultValue(value) {
    this.setAttribute('value', String(value ?? ''));
  }

  focus(options) {
    this._input?.focus(options);
  }

  /** The form this field submits to, or null when it is outside one. */
  get form() {
    return this._input?.form ?? null;
  }

  /** Native constraint validation state of the inner input. */
  get validity() {
    return this._input?.validity ?? null;
  }

  get validationMessage() {
    return this._input?.validationMessage ?? '';
  }

  get willValidate() {
    return this._input?.willValidate ?? false;
  }

  get control() {
    return this._input ?? null;
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

  select() {
    this._input?.select();
  }
}

const FORWARDED_ATTRIBUTES = [
  'name',
  'autocomplete',
  'min',
  'max',
  'minlength',
  'maxlength',
  'pattern',
  'step',
  'inputmode',
  'enterkeyhint',
  'autocapitalize',
  'spellcheck',
  'multiple',
  'accept',
  'capture',
  'list',
  'form',
];

function syncAttribute(host, input, name) {
  const value = host.getAttribute(name);
  if (value === null) {
    input.removeAttribute(name);
    return;
  }

  input.setAttribute(name, value);
}
