import { AihioElement } from '../base.js';

export class AihioInput extends AihioElement {
  static tag = 'aihio-input';
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
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
  ];
  static styles = `
    aihio-input {
      display: inline-flex;
      position: relative;
      width: 100%;
    }

    aihio-input input {
      display: flex;
      width: 100%;
      height: var(--input-height-md);
      border-radius: var(--radius-intent-interactive);
      border: 1px solid oklch(var(--color-intent-field-border));
      background-color: transparent;
      padding: var(--spacing-intent-field-padding-block) var(--spacing-intent-field-padding-inline);
      font-size: var(--fontSize-intent-control);
      line-height: var(--lineHeight-intent-body);
      color: oklch(var(--color-intent-page-fg));
      transition: border-color var(--duration-intent-feedback) ease,
                  box-shadow var(--duration-intent-feedback) ease;
    }

    aihio-input input::placeholder {
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    aihio-input input:focus-visible {
      outline: none;
      border-color: oklch(var(--color-intent-focus-ring));
      box-shadow: 0 0 0 1px oklch(var(--color-intent-focus-ring));
    }

    aihio-input input:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* Sizes */
    aihio-input[size="sm"] input {
      height: var(--input-height-sm);
      font-size: var(--fontSize-intent-control-sm);
      padding: var(--spacing-intent-field-padding-block-sm) var(--spacing-intent-field-padding-inline-sm);
    }
    aihio-input[size="lg"] input {
      height: var(--input-height-lg);
      font-size: var(--fontSize-intent-control-lg);
      padding: var(--spacing-intent-field-padding-block-lg) var(--spacing-intent-field-padding-inline-lg);
    }

    /* Error state */
    aihio-input[error] input {
      border-color: oklch(var(--color-intent-state-destructive-bg));
    }
    aihio-input[error] input:focus-visible {
      border-color: oklch(var(--color-intent-state-destructive-bg));
      box-shadow: 0 0 0 1px oklch(var(--color-intent-state-destructive-bg));
    }

    @media (forced-colors: active) {
      aihio-input input {
        background-color: Field;
        color: FieldText;
        border-color: FieldText;
      }

      aihio-input input:focus-visible {
        outline: 2px solid Highlight;
        outline-offset: 2px;
        box-shadow: none;
      }

      aihio-input input:disabled {
        color: GrayText;
        border-color: GrayText;
        opacity: 1;
      }

      /* Colour cannot mark the error state here, so widen the border: a shape
         signal survives forced colours. The message text carries the rest. */
      aihio-input[error] input {
        border-width: 2px;
        border-color: FieldText;
      }
    }
  `;

  setup() {
    this._input = this.querySelector('input') ?? document.createElement('input');
    this._form = null;

    // The host `value` attribute tracks the live value (it is mirrored back on
    // every keystroke), so it cannot also serve as the reset target. Capture
    // the authored value once and hand it to the inner input as its
    // defaultValue, which is what form.reset() restores to.
    this._input.defaultValue = this.getAttribute('value') ?? '';

    this._onReset = () => {
      // The reset event fires before the controls are reset, so read back on
      // the next microtask and mirror the restored value onto the host.
      queueMicrotask(() => {
        if (!this._input) return;
        this.setAttribute('value', this._input.value);
      });
    };

    this._onInput = () => {
      if (this.getAttribute('value') !== this._input.value) {
        this.setAttribute('value', this._input.value);
      }
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

  teardown() {
    this._input?.removeEventListener('input', this._onInput);
    this._input?.removeEventListener('change', this._onChange);
    this._detachForm();
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
    const value = this.attr('value', '');
    const disabled = this.boolAttr('disabled');
    const error = this.boolAttr('error');
    const required = this.boolAttr('required');
    const readOnly = this.boolAttr('readonly');

    if (this._input.type !== type) this._input.type = type;
    if (this._input.placeholder !== placeholder) this._input.placeholder = placeholder;
    if (this._input.value !== value) this._input.value = value;
    if (this._input.disabled !== disabled) this._input.disabled = disabled;
    if (this._input.required !== required) this._input.required = required;
    if (this._input.readOnly !== readOnly) this._input.readOnly = readOnly;

    // The inner <input> is real light DOM inside the author's <form>, so
    // forwarding name/autocomplete is all that form submission needs — no
    // ElementInternals, no value shadowing.
    syncAttribute(this, this._input, 'name');
    syncAttribute(this, this._input, 'autocomplete');

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
    this.setAttribute('value', String(v ?? ''));
  }

  focus() {
    this._input?.focus();
  }

  /** The form this field submits to, or null when it is outside one. */
  get form() {
    return this._input?.form ?? null;
  }

  /** Native constraint validation state of the inner input. */
  get validity() {
    return this._input?.validity ?? null;
  }

  checkValidity() {
    return this._input?.checkValidity() ?? true;
  }

  reportValidity() {
    return this._input?.reportValidity() ?? true;
  }
}

function syncAttribute(host, input, name) {
  const value = host.getAttribute(name);
  if (value === null) {
    input.removeAttribute(name);
    return;
  }

  input.setAttribute(name, value);
}
