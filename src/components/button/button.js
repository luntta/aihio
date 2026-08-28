import { AihioElement } from '../base.js';

export class AihioButton extends AihioElement {
  static tag = 'aihio-button';
  // Form association is what makes type="submit" mean anything. Without it a
  // custom element inside a <form> is inert markup: no submit, no reset, no
  // membership in form.elements.
  static formAssociated = true;
  static observedAttributes = ['variant', 'size', 'disabled', 'loading', 'type'];
  static styles = `
    aihio-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-intent-control-gap);
      white-space: nowrap;
      border-radius: var(--radius-intent-interactive);
      font-size: var(--fontSize-intent-control);
      font-weight: var(--fontWeight-intent-control);
      height: var(--button-height-md);
      padding-inline: var(--button-padding-x-md);
      border: 1px solid transparent;
      cursor: pointer;
      transition: background-color var(--duration-intent-feedback) ease,
                  color var(--duration-intent-feedback) ease,
                  border-color var(--duration-intent-feedback) ease,
                  opacity var(--duration-intent-feedback) ease;
      user-select: none;
      text-decoration: none;
      line-height: var(--lineHeight-intent-compact);
    }

    /* Variants */
    aihio-button:not([variant]),
    aihio-button[variant="default"] {
      background-color: oklch(var(--color-intent-action-primary-bg));
      color: oklch(var(--color-intent-action-primary-fg));
    }
    aihio-button:not([variant]):hover,
    aihio-button[variant="default"]:hover {
      background-color: oklch(var(--color-intent-action-primary-bg) / 0.9);
    }

    aihio-button[variant="secondary"] {
      background-color: oklch(var(--color-intent-action-secondary-bg));
      color: oklch(var(--color-intent-action-secondary-fg));
    }
    aihio-button[variant="secondary"]:hover {
      background-color: oklch(var(--color-intent-action-secondary-bg) / 0.8);
    }

    aihio-button[variant="outline"] {
      background-color: transparent;
      color: oklch(var(--color-intent-page-fg));
      border-color: oklch(var(--color-intent-border-subtle));
    }
    aihio-button[variant="outline"]:hover {
      background-color: oklch(var(--color-intent-action-accent-bg));
      color: oklch(var(--color-intent-action-accent-fg));
    }

    aihio-button[variant="ghost"] {
      background-color: transparent;
      color: oklch(var(--color-intent-page-fg));
    }
    aihio-button[variant="ghost"]:hover {
      background-color: oklch(var(--color-intent-action-accent-bg));
      color: oklch(var(--color-intent-action-accent-fg));
    }

    aihio-button[variant="link"] {
      background-color: transparent;
      color: oklch(var(--color-intent-action-primary-bg));
      text-decoration: underline;
      text-underline-offset: 4px;
      height: auto;
      padding-inline: 0;
    }
    aihio-button[variant="link"]:hover {
      text-underline-offset: 2px;
    }

    aihio-button[variant="destructive"] {
      background-color: oklch(var(--color-intent-state-destructive-bg));
      color: oklch(var(--color-intent-state-destructive-fg));
    }
    aihio-button[variant="destructive"]:hover {
      background-color: oklch(var(--color-intent-state-destructive-bg) / 0.9);
    }

    /* Sizes */
    aihio-button[size="sm"] {
      height: var(--button-height-sm);
      padding-inline: var(--button-padding-x-sm);
      font-size: var(--fontSize-intent-control-sm);
      border-radius: var(--radius-intent-interactive-compact);
    }
    aihio-button[size="lg"] {
      height: var(--button-height-lg);
      padding-inline: var(--button-padding-x-lg);
      font-size: var(--fontSize-intent-control-lg);
      border-radius: var(--radius-intent-interactive);
    }
    aihio-button[size="icon"] {
      height: var(--button-height-icon);
      width: var(--button-height-icon);
      padding: 0;
    }

    /* States */
    aihio-button[disabled] {
      pointer-events: none;
      opacity: 0.5;
    }
    aihio-button[loading] {
      pointer-events: none;
    }

    /* A loading button has to look different, not just behave differently.
       aria-busy covers assistive tech; this covers everyone else. */
    aihio-button[loading]::before {
      content: "";
      width: 1em;
      height: 1em;
      flex: none;
      border-radius: var(--radius-intent-pill);
      border: 2px solid currentColor;
      border-block-start-color: transparent;
      animation: aihio-button-spin var(--duration-intent-spinner) linear infinite;
    }

    @keyframes aihio-button-spin {
      to { transform: rotate(1turn); }
    }

    @media (prefers-reduced-motion: reduce) {
      aihio-button[loading]::before {
        animation: none;
        border-block-start-color: currentColor;
        opacity: 0.5;
      }
    }

    aihio-button:focus-visible {
      outline: 2px solid oklch(var(--color-intent-focus-ring));
      outline-offset: 2px;
    }
  `;

  setup() {
    this._defaultTabIndex = this.getAttribute('tabindex') ?? '0';
    this._internals = this.attachInternals?.() ?? null;

    this._onClickCapture = (e) => {
      if (!this._isDisabledLike()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    this._onKeyDown = (e) => {
      if (this._isDisabledLike()) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    };

    this._onClick = () => {
      if (this._isDisabledLike()) return;
      this._submitOrReset();
    };

    this.addEventListener('click', this._onClickCapture, { capture: true });
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
  }

  teardown() {
    this.removeEventListener('click', this._onClickCapture, { capture: true });
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeyDown);
  }

  sync() {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'button');
    }

    const disabled = this._isDisabledLike();
    const tabIndex = Number.parseInt(this._defaultTabIndex ?? '0', 10);

    this.tabIndex = disabled ? -1 : Number.isNaN(tabIndex) ? 0 : tabIndex;
    this.setAria('disabled', disabled ? 'true' : null);
    this.setAria('busy', this.boolAttr('loading') ? 'true' : null);
  }

  _isDisabledLike() {
    return this.boolAttr('disabled') || this.boolAttr('loading');
  }

  /** The form this button belongs to, or null when it is outside one. */
  get form() {
    return this._internals?.form ?? null;
  }

  get type() {
    const type = this.attr('type', 'button');
    return type === 'submit' || type === 'reset' ? type : 'button';
  }

  set type(value) {
    this.setAttribute('type', String(value));
  }

  _submitOrReset() {
    const type = this.type;
    if (type === 'button') return;

    const form = this.form;
    if (!form) return;

    // requestSubmit() runs constraint validation and fires submit, unlike
    // submit(). It is called without a submitter because a form-associated
    // custom element is not a valid submitter argument.
    if (type === 'submit') form.requestSubmit();
    else form.reset();
  }

  /**
   * Fires when the element is disabled by an ancestor <fieldset disabled>,
   * which form association gives us for free.
   */
  formDisabledCallback(disabled) {
    this.setBoolAttr('disabled', disabled);
  }
}
