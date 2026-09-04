import { AihioElement } from '../base.js';

let dropdownInstanceId = 0;

export class AihioDropdown extends AihioElement {
  static tag = 'aihio-dropdown';
  static schemaVersion = '1.1.0';
  static shadow = true;
  static observedAttributes = ['open', 'align'];
  static styles = `
    :host {
      display: inline-block;
      position: relative;
    }

    .content {
      display: none;
      position: fixed;
      inset: auto;
      margin: 0;
      z-index: 50;
      min-width: 8rem;
      max-width: calc(100vw - (var(--spacing-intent-stack-md) * 2));
      max-height: calc(100dvh - (var(--spacing-intent-stack-md) * 2));
      overflow-y: auto;
      border-radius: var(--radius-intent-interactive);
      border: 1px solid oklch(var(--color-intent-border-subtle));
      background-color: oklch(var(--color-intent-overlay-bg));
      color: oklch(var(--color-intent-overlay-fg));
      padding: var(--spacing-intent-cluster-gap-tight);
      box-shadow: var(--shadow-intent-overlay);
      animation: dropdown-in var(--duration-intent-feedback) ease;
    }

    .content[data-fallback-open] {
      display: block;
    }

    .content:popover-open {
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

    @media (prefers-reduced-motion: reduce) {
      .content {
        animation: none;
      }
    }

    @media (forced-colors: active) {
      .content {
        border-color: CanvasText;
      }
    }
  `;

  setup() {
    this._dropdownId = ++dropdownInstanceId;
    this.shadowRoot.innerHTML = `
      <slot name="trigger"></slot>
      <div class="content" role="menu" part="content" popover="manual">
        <slot></slot>
      </div>
    `;

    this._content = this.shadowRoot.querySelector('.content');
    this._triggerSlot = this.shadowRoot.querySelector('slot[name="trigger"]');
    this._content.id = `aihio-dropdown-${this._dropdownId}-content`;
    this._supportsPopover = typeof this._content.showPopover === 'function';
    this._isOpen = false;
    this._restoreFocusOnClose = false;

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
      this.close({ reason: 'outside' });
    };

    this._onTriggerSlotChange = () => this.refresh();
    this._onViewportChange = () => this._positionContent();
    this._onPopoverToggle = (event) => {
      if (event.newState !== 'closed' || !this._isOpen) return;
      this._isOpen = false;
      this.removeAttribute('open');
      this._removeViewportListeners();
      this.emit('aihio-close', { reason: 'native-dismiss' });
    };

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
    this._triggerSlot.addEventListener('slotchange', this._onTriggerSlotChange);
    this._content.addEventListener('toggle', this._onPopoverToggle);
  }

  connect() {
    document.removeEventListener('pointerdown', this._onOutsidePointerDown);
    document.addEventListener('pointerdown', this._onOutsidePointerDown);
  }

  disconnect() {
    document.removeEventListener('pointerdown', this._onOutsidePointerDown);
    this._removeViewportListeners();
    if (this._supportsPopover && this._content?.matches(':popover-open')) {
      this._content.hidePopover();
    }
    this._content?.removeAttribute('data-fallback-open');
    this._isOpen = false;
  }

  sync() {
    const isOpen = this.hasAttribute('open');
    const trigger = this._getTrigger();

    if (isOpen && !this._isOpen) this._showContent();
    else if (!isOpen && this._isOpen) this._hideContent();

    if (!trigger) return;

    trigger.setAttribute('aria-haspopup', 'menu');
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

    if (focus) {
      requestAnimationFrame(() => this._focusItem(focus));
    }
  }

  close({ restoreFocus = false, reason = 'api' } = {}) {
    if (!this.hasAttribute('open')) return;
    if (!this.emit('aihio-before-close', { reason }, { cancelable: true })) return;
    this._restoreFocusOnClose = restoreFocus;
    this._closeReason = reason;
    this.removeAttribute('open');
  }

  _getTrigger() {
    return [...this.children].find((child) => child.getAttribute('slot') === 'trigger') ?? null;
  }

  _getItems() {
    return [...this.querySelectorAll('aihio-dropdown-item:not([disabled])')].filter(
      (item) => item.closest('aihio-dropdown') === this
    );
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

  _showContent() {
    if (!this.isConnected) return;
    this._isOpen = true;
    if (this._supportsPopover) {
      if (!this._content.matches(':popover-open')) this._content.showPopover();
    } else {
      this._content.setAttribute('data-fallback-open', '');
    }
    this._addViewportListeners();
    this._positionContent();
    this.emit('aihio-open');
  }

  _hideContent() {
    this._isOpen = false;
    if (this._supportsPopover && this._content.matches(':popover-open')) {
      this._content.hidePopover();
    }
    this._content.removeAttribute('data-fallback-open');
    this._removeViewportListeners();

    if (this._restoreFocusOnClose) this._getTrigger()?.focus({ preventScroll: true });
    this._restoreFocusOnClose = false;
    this.emit('aihio-close', { reason: this._closeReason ?? 'attribute' });
    this._closeReason = null;
  }

  _addViewportListeners() {
    window.addEventListener('resize', this._onViewportChange);
    window.addEventListener('scroll', this._onViewportChange, true);
  }

  _removeViewportListeners() {
    window.removeEventListener('resize', this._onViewportChange);
    window.removeEventListener('scroll', this._onViewportChange, true);
  }

  _positionContent() {
    if (!this._isOpen) return;
    const trigger = this._getTrigger();
    if (!trigger) return;

    const edge = 8;
    const gap = 4;
    const triggerRect = trigger.getBoundingClientRect();
    const contentRect = this._content.getBoundingClientRect();
    let left = this.attr('align', 'start') === 'end'
      ? triggerRect.right - contentRect.width
      : triggerRect.left;
    left = Math.min(Math.max(edge, left), Math.max(edge, window.innerWidth - contentRect.width - edge));

    let top = triggerRect.bottom + gap;
    if (top + contentRect.height > window.innerHeight - edge) {
      const above = triggerRect.top - contentRect.height - gap;
      top = above >= edge ? above : edge;
    }

    this._content.style.left = `${Math.round(left)}px`;
    this._content.style.top = `${Math.round(top)}px`;
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

    @media (forced-colors: active) {
      aihio-dropdown-item:hover,
      aihio-dropdown-item:focus {
        background-color: Highlight;
        color: HighlightText;
      }

      aihio-dropdown-item[disabled] {
        color: GrayText;
        opacity: 1;
      }
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
      this.emit('aihio-select', { value: this.attr('value', this.textContent.trim()) });
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
