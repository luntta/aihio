import { AihioElement } from '../base.js';
import { isTopOverlay, lockDocumentScroll, unlockDocumentScroll } from '../overlay-stack.js';

let dialogInstanceId = 0;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  // aihio-button is not listed: it delegates to a real <button>, which the
  // native entry above already matches. Listing the host too would put the
  // wrapper in the list at the same position as the control it wraps.
  'aihio-toggle:not([disabled])',
  'aihio-dropdown-item:not([disabled])',
  'aihio-tab:not([disabled])',
].join(', ');

export class AihioDialog extends AihioElement {
  static tag = 'aihio-dialog';
  static schemaVersion = '1.1.0';
  static shadow = true;
  static observedAttributes = ['open', 'aria-label'];
  static styles = `
    :host {
      display: contents;
    }

    .panel {
      width: 100%;
      max-width: var(--dialog-width);
      max-height: calc(100dvh - (var(--spacing-intent-stack-md) * 2));
      overflow-y: auto;
      border-radius: var(--radius-intent-surface);
      border: 1px solid oklch(var(--color-intent-border-subtle));
      background-color: oklch(var(--color-intent-surface-bg));
      color: oklch(var(--color-intent-surface-fg));
      padding: var(--dialog-padding);
      box-shadow: var(--shadow-intent-modal);
      animation: dialog-in var(--duration-intent-overlay) ease;
      outline: none;
      overscroll-behavior: contain;
      margin: auto;
    }

    .panel:not([open]) {
      display: none;
    }

    .panel::backdrop {
      background-color: oklch(var(--color-intent-overlay-scrim));
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

    @media (prefers-reduced-motion: reduce) {
      .panel {
        animation: none;
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

    @media (forced-colors: active) {
      .panel {
        border-color: CanvasText;
      }
    }
  `;

  setup() {
    this._dialogId = ++dialogInstanceId;
    this._isOpen = false;
    this._restoreFocusOnClose = true;

    this.shadowRoot.innerHTML = `
      <dialog class="panel" part="panel">
        <slot></slot>
      </dialog>
    `;

    this._panel = this.shadowRoot.querySelector('.panel');
    this._slot = this.shadowRoot.querySelector('slot');

    this._onPanelClick = (event) => {
      if (event.target !== this._panel) return;
      const rect = this._panel.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) this.close({ reason: 'backdrop' });
    };

    this._onCancel = (event) => {
      event.preventDefault();
      this.close({ restoreFocus: true, reason: 'escape' });
    };

    this._onDocumentKeyDown = (event) => {
      if (!this._isOpen || !isTopOverlay(this)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close({ restoreFocus: true, reason: 'escape' });
      } else if (event.key === 'Tab') {
        this._trapFocus(event);
      }
    };

    this._onSlotChange = () => this.refresh();

    this._panel.addEventListener('click', this._onPanelClick);
    this._panel.addEventListener('cancel', this._onCancel);
    this._slot.addEventListener('slotchange', this._onSlotChange);
  }

  disconnect() {
    if (this._isOpen) {
      this._isOpen = false;
      if (this._panel?.open) this._panel.close();
      unlockDocumentScroll(this);
      document.removeEventListener('keydown', this._onDocumentKeyDown);
    }
  }

  sync() {
    if (!this._panel) return;

    const title = this._getOwnedPart('aihio-dialog-title');
    const description = this._getOwnedPart('aihio-dialog-description');

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
  }

  close({ restoreFocus = true, reason = 'api' } = {}) {
    if (!this.hasAttribute('open')) return;
    if (!this.emit('aihio-before-close', { reason }, { cancelable: true })) return;
    this._restoreFocusOnClose = restoreFocus;
    this._closeReason = reason;
    this.removeAttribute('open');
  }

  _onOpen() {
    if (!this.isConnected) return;
    this._isOpen = true;
    this._previousFocus = document.activeElement;
    lockDocumentScroll(this);
    document.addEventListener('keydown', this._onDocumentKeyDown);

    if (!this._panel.open) {
      this._panel.showModal();
    }

    this.emit('aihio-open');

    requestAnimationFrame(() => {
      const focusable = this._getFocusableElements();
      // The panel is fixed-position and therefore already in view, so the
      // browser's scroll-into-view would only move the document behind the
      // backdrop — visibly, if the dialog opened while the page was scrolled
      // elsewhere.
      (focusable[0] ?? this._panel)?.focus({ preventScroll: true });
    });
  }

  _onClose({ restoreFocus, reason } = {}) {
    this._isOpen = false;
    if (this._panel?.open) this._panel.close();
    unlockDocumentScroll(this);
    document.removeEventListener('keydown', this._onDocumentKeyDown);

    const shouldRestoreFocus = restoreFocus ?? this._restoreFocusOnClose !== false;
    this._restoreFocusOnClose = true;

    if (shouldRestoreFocus && this._previousFocus?.focus) {
      this._previousFocus.focus({ preventScroll: true });
    }
    this.emit('aihio-close', { reason: reason ?? this._closeReason ?? 'attribute' });
    this._closeReason = null;
  }

  _getFocusableElements() {
    return [...this.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
      if (element.hasAttribute?.('disabled')) return false;
      if (element.getAttribute?.('aria-hidden') === 'true') return false;
      return element.closest('aihio-dialog') === this;
    });
  }

  _getOwnedPart(selector) {
    return [...this.querySelectorAll(selector)].find(
      (element) => element.closest('aihio-dialog') === this
    ) ?? null;
  }

  _trapFocus(event) {
    const focusable = this._getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      this._panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === this._panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
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
      letter-spacing: var(--letterSpacing-intent-heading);
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
