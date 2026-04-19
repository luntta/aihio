import { AihioElement } from '../base.js';

let dialogInstanceId = 0;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'aihio-button:not([disabled]):not([loading])',
  'aihio-toggle:not([disabled])',
  'aihio-dropdown-item:not([disabled])',
  'aihio-tab:not([disabled])',
].join(', ');

export class AihioDialog extends AihioElement {
  static tag = 'aihio-dialog';
  static shadow = true;
  static observedAttributes = ['open', 'aria-label'];
  static styles = `
    :host {
      display: contents;
    }

    .backdrop {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 50;
      background-color: oklch(var(--color-intent-overlay-scrim));
      align-items: center;
      justify-content: center;
      padding: var(--spacing-intent-stack-md);
    }

    :host([open]) .backdrop {
      display: flex;
    }

    .panel {
      position: relative;
      width: 100%;
      max-width: var(--dialog-width);
      max-height: calc(100vh - (var(--spacing-intent-stack-md) * 2));
      overflow-y: auto;
      border-radius: var(--radius-intent-surface);
      border: 1px solid oklch(var(--color-intent-border-subtle));
      background-color: oklch(var(--color-intent-surface-bg));
      color: oklch(var(--color-intent-surface-fg));
      padding: var(--dialog-padding);
      box-shadow: var(--shadow-intent-modal);
      animation: dialog-in var(--duration-intent-overlay) ease;
      outline: none;
    }

    @keyframes dialog-in {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(var(--spacing-intent-control-gap));
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    ::slotted(aihio-dialog-header) {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-intent-stack-tight);
      margin-bottom: var(--spacing-intent-stack-md);
    }

    ::slotted(aihio-dialog-footer) {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-intent-control-gap);
      margin-top: var(--spacing-intent-stack-lg);
    }
  `;

  setup() {
    this._dialogId = ++dialogInstanceId;
    this._isOpen = false;
    this._restoreFocusOnClose = true;

    this.shadowRoot.innerHTML = `
      <div class="backdrop" part="backdrop">
        <div class="panel" role="dialog" aria-modal="true" part="panel" tabindex="-1">
          <slot></slot>
        </div>
      </div>
    `;

    this._backdrop = this.shadowRoot.querySelector('.backdrop');
    this._panel = this.shadowRoot.querySelector('.panel');
    this._slot = this.shadowRoot.querySelector('slot');

    this._onBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        this.close();
      }
    };

    this._onDocumentKeyDown = (e) => {
      if (!this.hasAttribute('open')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close({ restoreFocus: true });
      } else if (e.key === 'Tab') {
        this._trapFocus(e);
      }
    };

    this._onSlotChange = () => this.refresh();

    this._backdrop.addEventListener('click', this._onBackdropClick);
    this._slot.addEventListener('slotchange', this._onSlotChange);
  }

  teardown() {
    this._backdrop?.removeEventListener('click', this._onBackdropClick);
    this._slot?.removeEventListener('slotchange', this._onSlotChange);
    if (this._isOpen) {
      this._onClose();
    }
  }

  sync() {
    if (!this._panel) return;

    const title = this.querySelector('aihio-dialog-title');
    const description = this.querySelector('aihio-dialog-description');

    if (title && !title.id) title.id = `aihio-dialog-${this._dialogId}-title`;
    if (description && !description.id) {
      description.id = `aihio-dialog-${this._dialogId}-description`;
    }

    if (title) this._panel.setAttribute('aria-labelledby', title.id);
    else this._panel.removeAttribute('aria-labelledby');

    if (description) this._panel.setAttribute('aria-describedby', description.id);
    else this._panel.removeAttribute('aria-describedby');

    const ariaLabel = this.getAttribute('aria-label');
    if (!title && ariaLabel) {
      this._panel.setAttribute('aria-label', ariaLabel);
    } else {
      this._panel.removeAttribute('aria-label');
    }

    if (this.hasAttribute('open') && !this._isOpen) {
      this._onOpen();
    } else if (!this.hasAttribute('open') && this._isOpen) {
      this._onClose();
    }
  }

  open() {
    if (this.hasAttribute('open')) return;
    this.setAttribute('open', '');
    this.emit('open');
  }

  close({ restoreFocus = true } = {}) {
    if (!this.hasAttribute('open')) return;
    this._restoreFocusOnClose = restoreFocus;
    this.removeAttribute('open');
    this.emit('close');
  }

  _onOpen() {
    this._isOpen = true;
    this._previousFocus = document.activeElement;
    this._previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onDocumentKeyDown);

    requestAnimationFrame(() => {
      const focusable = this._getFocusableElements();
      (focusable[0] ?? this._panel)?.focus();
    });
  }

  _onClose() {
    this._isOpen = false;
    document.body.style.overflow = this._previousBodyOverflow ?? '';
    document.removeEventListener('keydown', this._onDocumentKeyDown);

    const shouldRestoreFocus = this._restoreFocusOnClose !== false;
    this._restoreFocusOnClose = true;

    if (shouldRestoreFocus && this._previousFocus?.focus) {
      this._previousFocus.focus();
    }
  }

  _getFocusableElements() {
    return [...this.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
      if (element.hasAttribute?.('disabled')) return false;
      if (element.getAttribute?.('aria-hidden') === 'true') return false;
      return true;
    });
  }

  _trapFocus(e) {
    const focusable = this._getFocusableElements();
    if (focusable.length === 0) {
      e.preventDefault();
      this._panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || active === this._panel) {
        e.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

export class AihioDialogHeader extends AihioElement {
  static tag = 'aihio-dialog-header';
  static styles = `
    aihio-dialog-header {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-intent-stack-tight);
      margin-bottom: var(--spacing-intent-stack-md);
    }
  `;
}

export class AihioDialogTitle extends AihioElement {
  static tag = 'aihio-dialog-title';
  static styles = `
    aihio-dialog-title {
      display: block;
      font-size: var(--fontSize-intent-heading-sm);
      font-weight: var(--fontWeight-intent-heading);
      line-height: var(--lineHeight-intent-compact);
      letter-spacing: -0.01em;
    }
  `;
}

export class AihioDialogDescription extends AihioElement {
  static tag = 'aihio-dialog-description';
  static styles = `
    aihio-dialog-description {
      display: block;
      font-size: var(--fontSize-intent-body-sm);
      color: oklch(var(--color-intent-surface-muted-fg));
    }
  `;
}

export class AihioDialogFooter extends AihioElement {
  static tag = 'aihio-dialog-footer';
  static styles = `
    aihio-dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-intent-control-gap);
      margin-top: var(--spacing-intent-stack-lg);
    }
  `;
}
