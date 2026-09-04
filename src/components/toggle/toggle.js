import { AihioElement } from '../base.js';

export class AihioToggle extends AihioElement {
  static tag = 'aihio-toggle';
  static schemaVersion = '1.0.0';
  static observedAttributes = ['pressed', 'disabled', 'variant', 'size'];
  static styles = `
    aihio-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-intent-control-gap);
      border-radius: var(--radius-intent-interactive);
      font-size: var(--fontSize-intent-control);
      font-weight: var(--fontWeight-intent-control);
      height: var(--button-height-md);
      padding-inline: var(--button-padding-x-md);
      border: 1px solid transparent;
      cursor: pointer;
      user-select: none;
      background-color: transparent;
      color: oklch(var(--color-intent-surface-muted-fg));
      transition: background-color var(--duration-intent-feedback) ease,
                  color var(--duration-intent-feedback) ease;
    }

    aihio-toggle:hover {
      background-color: oklch(var(--color-intent-surface-muted-bg));
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    aihio-toggle[pressed] {
      background-color: oklch(var(--color-intent-action-accent-bg));
      color: oklch(var(--color-intent-action-accent-fg));
    }

    aihio-toggle[variant="outline"] {
      border-color: oklch(var(--color-intent-border-subtle));
    }
    aihio-toggle[variant="outline"][pressed] {
      background-color: oklch(var(--color-intent-action-accent-bg));
    }

    /* Sizes */
    aihio-toggle[size="sm"] {
      height: var(--button-height-sm);
      padding-inline: var(--button-padding-x-sm);
    }
    aihio-toggle[size="lg"] {
      height: var(--button-height-lg);
      padding-inline: var(--button-padding-x-lg);
    }

    aihio-toggle[disabled] {
      pointer-events: none;
      opacity: 0.5;
    }

    aihio-toggle:focus-visible {
      outline: 2px solid oklch(var(--color-intent-focus-ring));
      outline-offset: 2px;
    }

    @media (forced-colors: active) {
      aihio-toggle {
        background-color: ButtonFace;
        color: ButtonText;
        border: 1px solid ButtonBorder;
      }

      /* Pressed is a selected state, and Highlight/HighlightText is the system
         pair for selection — without it the only cue is a background colour
         that forced colours discards. */
      aihio-toggle[pressed] {
        background-color: Highlight;
        color: HighlightText;
        border-color: Highlight;
      }

      aihio-toggle[disabled] {
        color: GrayText;
        border-color: GrayText;
        opacity: 1;
      }

      aihio-toggle:focus-visible {
        outline-color: Highlight;
      }
    }
  `;

  setup() {
    this._defaultTabIndex = this.getAttribute('tabindex') ?? '0';

    this._onClickCapture = (e) => {
      if (!this.boolAttr('disabled')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    this._onClick = () => {
      if (this.hasAttribute('disabled')) return;
      const pressed = this.boolAttr('pressed');
      if (pressed) {
        this.removeAttribute('pressed');
      } else {
        this.setAttribute('pressed', '');
      }
      this.emit('aihio-toggle', { pressed: !pressed });
    };

    this._onKeyDown = (e) => {
      if (this.boolAttr('disabled')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    };

    this.addEventListener('click', this._onClickCapture, { capture: true });
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
  }

  sync() {
    const disabled = this.boolAttr('disabled');
    const tabIndex = Number.parseInt(this._defaultTabIndex ?? '0', 10);

    this.setAttribute('role', 'button');
    this.tabIndex = disabled ? -1 : Number.isNaN(tabIndex) ? 0 : tabIndex;
    this.setAria('pressed', String(this.boolAttr('pressed')));
    this.setAria('disabled', disabled ? 'true' : null);
  }
}
