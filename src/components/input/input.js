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
  `;

  setup() {
    this._input = this.querySelector('input') ?? document.createElement('input');

    this._onInput = () => {
      if (this.getAttribute('value') !== this._input.value) {
        this.setAttribute('value', this._input.value);
      }
      this.emit('input', { value: this._input.value });
    };

    this._onChange = () => {
      this.emit('change', { value: this._input.value });
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
  }

  sync() {
    if (!this._input) return;

    const type = this.attr('type', 'text');
    const placeholder = this.attr('placeholder', '');
    const value = this.attr('value', '');
    const disabled = this.boolAttr('disabled');
    const error = this.boolAttr('error');

    if (this._input.type !== type) this._input.type = type;
    if (this._input.placeholder !== placeholder) this._input.placeholder = placeholder;
    if (this._input.value !== value) this._input.value = value;
    if (this._input.disabled !== disabled) this._input.disabled = disabled;

    this._input.setAttribute('aria-invalid', String(error));

    syncAria(this, this._input, 'aria-label');
    syncAria(this, this._input, 'aria-labelledby');
    syncAria(this, this._input, 'aria-describedby');
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
}

function syncAria(host, input, name) {
  const value = host.getAttribute(name);
  if (value === null) {
    input.removeAttribute(name);
    return;
  }

  input.setAttribute(name, value);
}
