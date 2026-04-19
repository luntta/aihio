import { AihioElement } from '../base.js';

let dropdownInstanceId = 0;

export class AihioDropdown extends AihioElement {
  static tag = 'aihio-dropdown';
  static shadow = true;
  static observedAttributes = ['open', 'align'];
  static styles = `
    :host {
      display: inline-block;
      position: relative;
    }

    .content {
      display: none;
      position: absolute;
      z-index: 50;
      min-width: 8rem;
      top: calc(100% + var(--spacing-intent-cluster-gap-tight));
      left: 0;
      border-radius: var(--radius-intent-interactive);
      border: 1px solid oklch(var(--color-intent-border-subtle));
      background-color: oklch(var(--color-intent-overlay-bg));
      color: oklch(var(--color-intent-overlay-fg));
      padding: var(--spacing-intent-cluster-gap-tight);
      box-shadow: var(--shadow-intent-overlay);
      animation: dropdown-in var(--duration-intent-feedback) ease;
    }

    :host([align="end"]) .content {
      left: auto;
      right: 0;
    }

    :host([open]) .content {
      display: block;
    }

    @keyframes dropdown-in {
      from {
        opacity: 0;
        transform: translateY(calc(var(--spacing-intent-cluster-gap-tight) * -1));
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  setup() {
    this._dropdownId = ++dropdownInstanceId;
    this.shadowRoot.innerHTML = `
      <slot name="trigger"></slot>
      <div class="content" role="menu" part="content">
        <slot></slot>
      </div>
    `;

    this._content = this.shadowRoot.querySelector('.content');
    this._triggerSlot = this.shadowRoot.querySelector('slot[name="trigger"]');
    this._content.id = `aihio-dropdown-${this._dropdownId}-content`;

    this._onClick = (e) => {
      if (!this._isTriggerEvent(e)) return;
      e.preventDefault();
      e.stopPropagation();
      this.toggle({ focus: this.hasAttribute('open') ? null : 'first' });
    };

    this._onKeyDown = (e) => {
      const isTriggerEvent = this._isTriggerEvent(e);

      if (isTriggerEvent && !this.hasAttribute('open')) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.open({ focus: 'first' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.open({ focus: 'last' });
        }
        return;
      }

      if (!this.hasAttribute('open')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close({ restoreFocus: true });
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._focusAdjacentItem(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._focusAdjacentItem(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        this._focusItem('first');
      } else if (e.key === 'End') {
        e.preventDefault();
        this._focusItem('last');
      }
    };

    this._onOutsidePointerDown = (e) => {
      if (!this.hasAttribute('open')) return;
      if (e.composedPath().includes(this)) return;
      this.close();
    };

    this._onTriggerSlotChange = () => this.refresh();

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
    this._triggerSlot.addEventListener('slotchange', this._onTriggerSlotChange);
    document.addEventListener('pointerdown', this._onOutsidePointerDown);
  }

  teardown() {
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeyDown);
    this._triggerSlot?.removeEventListener('slotchange', this._onTriggerSlotChange);
    document.removeEventListener('pointerdown', this._onOutsidePointerDown);
  }

  sync() {
    const isOpen = this.hasAttribute('open');
    const trigger = this._getTrigger();

    this._content.hidden = !isOpen;

    if (!trigger) return;

    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-controls', this._content.id);
    trigger.setAttribute('aria-expanded', String(isOpen));
  }

  toggle(options = {}) {
    if (this.hasAttribute('open')) {
      this.close({ restoreFocus: options.restoreFocus });
    } else {
      this.open(options);
    }
  }

  open({ focus = 'first' } = {}) {
    if (this.hasAttribute('open')) {
      if (focus) {
        requestAnimationFrame(() => this._focusItem(focus));
      }
      return;
    }

    this.setAttribute('open', '');
    this.emit('open');

    if (focus) {
      requestAnimationFrame(() => this._focusItem(focus));
    }
  }

  close({ restoreFocus = false } = {}) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.emit('close');

    if (restoreFocus) {
      this._getTrigger()?.focus();
    }
  }

  _getTrigger() {
    return this.querySelector('[slot="trigger"]');
  }

  _getItems() {
    return [...this.querySelectorAll('aihio-dropdown-item:not([disabled])')];
  }

  _isTriggerEvent(e) {
    const trigger = this._getTrigger();
    return Boolean(trigger && e.composedPath().includes(trigger));
  }

  _focusItem(target) {
    const items = this._getItems();
    if (items.length === 0) return;

    if (target === 'last') {
      items[items.length - 1]?.focus();
      return;
    }

    items[0]?.focus();
  }

  _focusAdjacentItem(direction) {
    const items = this._getItems();
    if (items.length === 0) return;

    const current = items.findIndex((item) => item === document.activeElement);
    const next = current === -1
      ? direction > 0 ? 0 : items.length - 1
      : (current + direction + items.length) % items.length;

    items[next]?.focus();
  }
}

export class AihioDropdownItem extends AihioElement {
  static tag = 'aihio-dropdown-item';
  static observedAttributes = ['disabled'];
  static styles = `
    aihio-dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-intent-control-gap);
      padding: var(--spacing-intent-stack-tight) var(--spacing-intent-field-padding-inline-sm);
      border-radius: var(--radius-intent-interactive-compact);
      font-size: var(--fontSize-intent-control);
      cursor: pointer;
      user-select: none;
      outline: none;
      transition: background-color var(--duration-intent-feedback-fast) ease,
                  color var(--duration-intent-feedback-fast) ease;
    }

    aihio-dropdown-item:hover,
    aihio-dropdown-item:focus-visible {
      background-color: oklch(var(--color-intent-action-accent-bg));
      color: oklch(var(--color-intent-action-accent-fg));
    }

    aihio-dropdown-item[disabled] {
      pointer-events: none;
      opacity: 0.5;
    }
  `;

  setup() {
    this._onClickCapture = (e) => {
      if (!this.hasAttribute('disabled')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    this._onClick = () => {
      if (this.hasAttribute('disabled')) return;
      this.emit('select', { value: this.attr('value', this.textContent.trim()) });
      this.closest('aihio-dropdown')?.close({ restoreFocus: true });
    };

    this._onKeyDown = (e) => {
      if (this.hasAttribute('disabled')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
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
    this.setAttribute('role', 'menuitem');
    this.setAttribute('tabindex', '-1');
    this.setAria('disabled', this.boolAttr('disabled') ? 'true' : null);
  }
}

export class AihioDropdownSeparator extends AihioElement {
  static tag = 'aihio-dropdown-separator';
  static styles = `
    aihio-dropdown-separator {
      display: block;
      height: 1px;
      background-color: oklch(var(--color-intent-border-subtle));
      margin: var(--spacing-intent-cluster-gap-tight) calc(var(--spacing-intent-cluster-gap-tight) * -1);
    }
  `;

  sync() {
    this.setAttribute('role', 'separator');
  }
}
