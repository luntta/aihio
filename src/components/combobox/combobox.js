import { AihioElement } from '../base.js';

let comboboxInstanceId = 0;

// PageUp/PageDown jump this many options, about one screenful of the list.
const PAGE_STEP = 10;

// The result count is announced once typing pauses. Any sooner and a fast
// typist hears a count per keystroke, each one interrupting the last.
const STATUS_DELAY = 500;

const VIEWPORT_EDGE = 8;
const POPUP_GAP = 4;

const WORD_CHARACTER = /[\p{L}\p{N}]/u;
const COMBINING_MARK = /\p{M}/gu;

const CHEVRON_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" data-combobox-part="check"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const field = (state = '') => `aihio-combobox [data-combobox-part="input"]${state}`;

export class AihioCombobox extends AihioElement {
  static tag = 'aihio-combobox';
  static schemaVersion = '1.0.0';
  static observedAttributes = [
    'value',
    'name',
    'form',
    'placeholder',
    'disabled',
    'readonly',
    'required',
    'error',
    'size',
    'filter',
    'allow-custom',
    'loading',
    'empty-text',
    'loading-text',
    'results-text',
    'open',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
  ];
  static styles = `
    aihio-combobox {
      display: inline-flex;
      position: relative;
      width: 100%;
    }

    /* The authored options are the data the list is rendered from, never the
       list itself: they stay hidden whether or not the element has upgraded. */
    aihio-combobox > aihio-option {
      display: none;
    }

    /* Hold the field's box before upgrade so server-rendered markup does not
       jump when the input appears. */
    aihio-combobox:not(:defined) {
      box-sizing: border-box;
      height: var(--input-height-md);
      border: 1px solid oklch(var(--color-intent-field-border));
      border-radius: var(--radius-intent-interactive);
    }

    ${field()} {
      display: flex;
      width: 100%;
      height: var(--input-height-md);
      margin: 0;
      border-radius: var(--radius-intent-interactive);
      border: 1px solid oklch(var(--color-intent-field-border));
      background-color: transparent;
      padding-block: var(--spacing-intent-field-padding-block);
      padding-inline: var(--spacing-intent-field-padding-inline) var(--input-height-md);
      font: inherit;
      font-size: var(--fontSize-intent-control);
      line-height: var(--lineHeight-intent-body);
      color: oklch(var(--color-intent-page-fg));
      text-overflow: ellipsis;
      transition: border-color var(--duration-intent-feedback) ease,
                  box-shadow var(--duration-intent-feedback) ease;
    }

    ${field('::placeholder')} {
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    ${field(':focus-visible')} {
      outline: none;
      border-color: oklch(var(--color-intent-focus-ring));
      box-shadow: 0 0 0 1px oklch(var(--color-intent-focus-ring));
    }

    ${field(':disabled')} {
      cursor: not-allowed;
      opacity: 0.5;
    }

    aihio-combobox[size="sm"] [data-combobox-part="input"] {
      height: var(--input-height-sm);
      font-size: var(--fontSize-intent-control-sm);
      padding-block: var(--spacing-intent-field-padding-block-sm);
      padding-inline: var(--spacing-intent-field-padding-inline-sm) var(--input-height-sm);
    }
    aihio-combobox[size="lg"] [data-combobox-part="input"] {
      height: var(--input-height-lg);
      font-size: var(--fontSize-intent-control-lg);
      padding-block: var(--spacing-intent-field-padding-block-lg);
      padding-inline: var(--spacing-intent-field-padding-inline-lg) var(--input-height-lg);
    }

    aihio-combobox[error] [data-combobox-part="input"] {
      border-color: oklch(var(--color-intent-state-destructive-bg));
    }
    aihio-combobox[error] [data-combobox-part="input"]:focus-visible {
      border-color: oklch(var(--color-intent-state-destructive-bg));
      box-shadow: 0 0 0 1px oklch(var(--color-intent-state-destructive-bg));
    }

    /* A pointer affordance only: it is out of the tab order, and the keyboard
       opens the list from the input itself. */
    aihio-combobox [data-combobox-part="toggle"] {
      position: absolute;
      inset-block: 0;
      inset-inline-end: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--input-height-md);
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: var(--radius-intent-interactive);
      background: none;
      color: oklch(var(--color-intent-surface-muted-fg));
      cursor: pointer;
      transition: color var(--duration-intent-feedback-fast) ease;
    }
    aihio-combobox[size="sm"] [data-combobox-part="toggle"] {
      width: var(--input-height-sm);
    }
    aihio-combobox[size="lg"] [data-combobox-part="toggle"] {
      width: var(--input-height-lg);
    }
    aihio-combobox [data-combobox-part="toggle"]:hover {
      color: oklch(var(--color-intent-page-fg));
    }
    aihio-combobox [data-combobox-part="toggle"]:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    aihio-combobox [data-combobox-part="toggle"] svg {
      transition: transform var(--duration-intent-feedback) ease;
    }
    aihio-combobox[open] [data-combobox-part="toggle"] svg {
      transform: rotate(180deg);
    }

    /* Shown in the top layer as a manual popover, so it escapes overflow
       clipping and sits above an open dialog. Selector specificity beats the
       UA [popover] rules (inset: 0, margin: auto) it has to undo. */
    aihio-combobox [data-combobox-part="popup"] {
      display: none;
      position: fixed;
      inset: auto;
      z-index: 50;
      box-sizing: border-box;
      width: max-content;
      min-width: var(--aihio-combobox-anchor-width, 12rem);
      max-width: calc(100vw - 1rem);
      max-height: min(20rem, var(--aihio-combobox-available-height, 20rem));
      margin: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: var(--spacing-intent-cluster-gap-tight);
      border: 1px solid oklch(var(--color-intent-border-subtle));
      border-radius: var(--radius-intent-interactive);
      background-color: oklch(var(--color-intent-overlay-bg));
      color: oklch(var(--color-intent-overlay-fg));
      box-shadow: var(--shadow-intent-overlay);
      font-size: var(--fontSize-intent-control);
      line-height: var(--lineHeight-intent-body);
      --aihio-combobox-shift: calc(var(--spacing-intent-cluster-gap-tight) * -1);
    }
    aihio-combobox [data-combobox-part="popup"][data-side="top"] {
      --aihio-combobox-shift: var(--spacing-intent-cluster-gap-tight);
    }
    aihio-combobox [data-combobox-part="popup"]:popover-open,
    aihio-combobox [data-combobox-part="popup"][data-fallback-open] {
      display: block;
      animation: aihio-combobox-in var(--duration-intent-feedback) ease;
    }

    @keyframes aihio-combobox-in {
      from {
        opacity: 0;
        transform: translateY(var(--aihio-combobox-shift));
      }
    }

    aihio-combobox [role="option"] {
      display: flex;
      align-items: center;
      gap: var(--spacing-intent-control-gap);
      padding: var(--spacing-intent-stack-tight) var(--spacing-intent-field-padding-inline-sm);
      border-radius: var(--radius-intent-interactive-compact);
      cursor: pointer;
      user-select: none;
    }

    /* Author display rules beat the UA's [hidden] rule, so restate it for
       the options and panels this stylesheet gives a display value. */
    aihio-combobox [role="option"][hidden],
    aihio-combobox [data-combobox-part="popup"] [hidden] {
      display: none;
    }

    /* The active option is the keyboard focus indicator here — the input
       keeps DOM focus, so no outline is drawn — and its fill has to read
       against the overlay in both themes. */
    aihio-combobox [role="option"][data-active] {
      background-color: oklch(var(--color-intent-overlay-highlight-bg));
      color: oklch(var(--color-intent-overlay-fg));
    }

    aihio-combobox [role="option"][aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.5;
    }

    aihio-combobox [data-combobox-part="option-label"] {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    /* The matched run is set in bold rather than tinted: weight survives
       forced colours and needs no contrast pair of its own. */
    aihio-combobox [data-combobox-part="option-label"] mark {
      background: none;
      color: inherit;
      font-weight: var(--fontWeight-intent-heading);
    }

    aihio-combobox [data-combobox-part="check"] {
      flex: none;
      margin-inline-start: auto;
      visibility: hidden;
    }
    aihio-combobox [role="option"][aria-selected="true"] [data-combobox-part="check"] {
      visibility: visible;
    }

    aihio-combobox [data-combobox-part="message"] {
      display: flex;
      align-items: center;
      gap: var(--spacing-intent-control-gap);
      padding: var(--spacing-intent-stack-tight) var(--spacing-intent-field-padding-inline-sm);
      color: oklch(var(--color-intent-surface-muted-fg));
      font-size: var(--fontSize-intent-body-sm);
    }

    aihio-combobox [data-combobox-part="message"][data-loading]::before {
      content: '';
      flex: none;
      width: 0.875em;
      height: 0.875em;
      border: 2px solid currentColor;
      border-inline-end-color: transparent;
      border-radius: var(--radius-intent-pill);
      animation: aihio-combobox-spin var(--duration-intent-spinner) linear infinite;
    }

    @keyframes aihio-combobox-spin {
      to {
        transform: rotate(360deg);
      }
    }

    aihio-combobox [data-combobox-part="status"] {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      border: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    @media (prefers-reduced-motion: reduce) {
      aihio-combobox [data-combobox-part="popup"]:popover-open,
      aihio-combobox [data-combobox-part="popup"][data-fallback-open],
      aihio-combobox [data-combobox-part="message"][data-loading]::before {
        animation: none;
      }
    }

    @media (forced-colors: active) {
      ${field()} {
        background-color: Field;
        color: FieldText;
        border-color: FieldText;
      }

      ${field(':focus-visible')} {
        outline: 2px solid Highlight;
        outline-offset: 2px;
        box-shadow: none;
      }

      ${field(':disabled')} {
        color: GrayText;
        border-color: GrayText;
        opacity: 1;
      }

      aihio-combobox[error] [data-combobox-part="input"] {
        border-width: 2px;
        border-color: FieldText;
      }

      aihio-combobox [data-combobox-part="toggle"] {
        color: ButtonText;
      }

      aihio-combobox [data-combobox-part="toggle"]:disabled {
        color: GrayText;
        opacity: 1;
      }

      aihio-combobox [data-combobox-part="popup"] {
        border-color: CanvasText;
      }

      /* Opt the highlighted option out of adjustment: otherwise the UA draws
         a Canvas backplate behind its text, and HighlightText on Canvas is
         invisible. The colours are stated explicitly instead. */
      aihio-combobox [role="option"][data-active] {
        forced-color-adjust: none;
        background-color: Highlight;
        color: HighlightText;
      }

      aihio-combobox [role="option"][aria-disabled="true"] {
        color: GrayText;
        opacity: 1;
      }
    }
  `;

  setup() {
    this._baseId = `aihio-combobox-${++comboboxInstanceId}`;
    this._records = new Map();
    this._recordByElement = new WeakMap();
    this._order = [];
    this._visible = [];
    this._active = null;
    this._activeByTyping = false;
    this._isOpen = false;
    this._pendingActive = null;
    this._closeReason = null;
    this._query = '';
    this._dirty = false;
    this._hasFocus = false;
    this._optionCount = 0;
    this._form = null;
    this._statusTimer = null;
    this._closeOnConnect = false;
    this._supportsPopover = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;

    // A clone of an upgraded combobox carries the parts the original rendered.
    // Drop them rather than rendering a second set beside them.
    for (const stale of this.querySelectorAll(':scope > [data-combobox-part]')) stale.remove();

    this._input = createPart('input', 'input', {
      id: `${this._baseId}-input`,
      type: 'text',
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': 'false',
      'aria-controls': `${this._baseId}-listbox`,
      // The browser's own autofill list would open on top of ours.
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
    });

    this._toggle = createPart('button', 'toggle', {
      type: 'button',
      tabindex: '-1',
      'aria-expanded': 'false',
      'aria-controls': `${this._baseId}-listbox`,
    });
    this._toggle.innerHTML = CHEVRON_ICON;

    // The chosen option's value is what submits, not the label on show, so it
    // travels in a hidden input under the author's name.
    this._hidden = createPart('input', 'value', { type: 'hidden' });

    this._popup = createPart('div', 'popup', { id: `${this._baseId}-popup` });
    if (this._supportsPopover) this._popup.setAttribute('popover', 'manual');

    this._listbox = createPart('div', 'listbox', {
      id: `${this._baseId}-listbox`,
      role: 'listbox',
    });
    this._message = createPart('div', 'message', { hidden: '' });
    this._popup.append(this._listbox, this._message);

    this._status = createPart('div', 'status', { role: 'status' });

    this._parts = [this._input, this._toggle, this._hidden, this._popup, this._status];
    this.prepend(...this._parts);

    const initial = this._pendingValue ?? this.getAttribute('value') ?? '';
    this._pendingValue = undefined;
    this._value = initial;
    this._label = null;
    this._hidden.value = initial;

    this._onInput = () => {
      this._query = this._input.value;
      this._dirty = true;
      if (this._isOpen) this._applyFilter();
      else this._open({ active: 'none' });
      if (this._isOpen) this._autoActivate();
      this._announceSoon();
      this.emit('aihio-search', { query: this._query });
    };

    this._onKeyDown = (event) => this._handleKey(event);

    // mousedown rather than click: clicking the field's <label> forwards a
    // synthetic click to the input, and focusing a field by its label should
    // not throw a list over the form.
    this._onInputMouseDown = (event) => {
      if (event.button !== 0 || this._isOpen) return;
      this._query = '';
      this._open({ active: 'selected' });
    };

    this._onFocus = () => {
      this._hasFocus = true;
    };

    // Options are never focused, so a blur means focus has left the field —
    // unless the input was blurred by being taken out of the document, which
    // _restoreParts() undoes. Chromium fires that blur just before the removal,
    // while the input is still connected, so decide once the mutation is done.
    this._onFocusOut = () => {
      queueMicrotask(() => {
        if (!this._input.isConnected || document.activeElement === this._input) return;
        this._hasFocus = false;
        this._settle({ reason: 'blur' });
      });
    };

    this._keepFocus = (event) => event.preventDefault();

    this._onToggleClick = () => {
      if (this._isOpen) {
        this._settle({ reason: 'toggle' });
      } else {
        this._query = '';
        this._open({ active: 'selected' });
      }
      this._input.focus({ preventScroll: true });
    };

    this._onPopupClick = (event) => {
      const record = this._recordFromEvent(event);
      if (!record || record.disabled) return;
      this._commit(record);
      this._close('select');
      this._input.focus({ preventScroll: true });
    };

    this._onPopupPointerMove = (event) => {
      // A finger dragging the list is scrolling it, not pointing at options.
      if (event.pointerType === 'touch') return;
      const record = this._recordFromEvent(event);
      if (!record || record.disabled || record === this._active) return;
      this._setActive(record, { scroll: false });
      this._activeByTyping = false;
    };

    this._onOutsidePointerDown = (event) => {
      if (!this._isOpen || event.composedPath().includes(this)) return;
      this._settle({ reason: 'outside' });
    };

    this._onViewportChange = (event) => {
      if (event?.target === this._popup) return;
      this._position();
    };

    // Reset restores native controls after the reset event has dispatched,
    // so wait for the task to finish before re-deriving the label from the
    // restored default.
    this._onReset = () => setTimeout(() => this._restoreDefault(), 0);

    this._observer = new MutationObserver((records) => {
      if (this._input.parentNode !== this) this._restoreParts();
      if (records.some((record) => this._isOptionMutation(record))) this._renderOptions();
    });

    this._input.addEventListener('input', this._onInput);
    this._input.addEventListener('keydown', this._onKeyDown);
    this._input.addEventListener('mousedown', this._onInputMouseDown);
    this._input.addEventListener('focus', this._onFocus);
    this._input.addEventListener('blur', this._onFocusOut);
    this._toggle.addEventListener('mousedown', this._keepFocus);
    this._toggle.addEventListener('click', this._onToggleClick);
    this._popup.addEventListener('mousedown', this._keepFocus);
    this._popup.addEventListener('click', this._onPopupClick);
    this._popup.addEventListener('pointermove', this._onPopupPointerMove);

    this._renderOptions();
  }

  connect() {
    this._observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'disabled'],
    });
    document.addEventListener('pointerdown', this._onOutsidePointerDown, true);

    // Moving the element in the DOM should not pop the list open again.
    if (this._closeOnConnect && this.hasAttribute('open')) this.removeAttribute('open');
    this._closeOnConnect = false;

    this._renderOptions();
  }

  disconnect() {
    this._observer.disconnect();
    document.removeEventListener('pointerdown', this._onOutsidePointerDown, true);
    clearTimeout(this._statusTimer);
    this._detachForm();
    this._hasFocus = false;
    if (this._isOpen) {
      this._teardownPopup();
      this._closeOnConnect = true;
    }
  }

  syncAttribute(name, _oldValue, newValue) {
    if (!this._input) return;

    if (name === 'value') {
      this._label = null;
      this._setValue(newValue ?? '', this._resolveLabel(), { emit: false });
    } else if (name === 'filter' || name === 'allow-custom') {
      this._applyFilter();
    } else if (name === 'loading' && this._isOpen) {
      this._announceSoon();
    }
  }

  sync() {
    if (!this._input) return;

    const input = this._input;
    const disabled = this.hasAttribute('disabled');
    const readOnly = this.hasAttribute('readonly');
    const required = this.hasAttribute('required');
    const placeholder = this.getAttribute('placeholder') ?? '';

    if (input.disabled !== disabled) input.disabled = disabled;
    if (input.readOnly !== readOnly) input.readOnly = readOnly;
    if (input.required !== required) input.required = required;
    if (input.placeholder !== placeholder) input.placeholder = placeholder;
    input.setAttribute('aria-invalid', String(this.hasAttribute('error')));

    this._hidden.disabled = disabled;
    mirrorAttribute(this, this._hidden, 'name');
    mirrorAttribute(this, this._hidden, 'form');
    mirrorAttribute(this, input, 'form');
    this._toggle.disabled = disabled || readOnly;

    this._syncLabelling();
    this._syncFormListener();
    this._syncMessage();

    const wantsOpen = this.hasAttribute('open');
    if (wantsOpen && !this._isOpen) this._show();
    else if (!wantsOpen && this._isOpen) this._hide();
    else if (this._isOpen && !this._canOpen()) this._close('disabled');
  }

  // --- Public API -----------------------------------------------------------

  /** Value of the chosen option, or the typed text when allow-custom is set. */
  get value() {
    return this._input ? this._value : this._pendingValue ?? this.getAttribute('value') ?? '';
  }

  set value(next) {
    const value = String(next ?? '');
    if (!this._input) {
      this._pendingValue = value;
      return;
    }
    this._label = null;
    this._setValue(value, this._resolveLabel(), { emit: false });
  }

  get defaultValue() {
    return this.getAttribute('value') ?? '';
  }

  set defaultValue(value) {
    this.setAttribute('value', String(value ?? ''));
  }

  /** The <aihio-option> whose value is chosen, or null. */
  get selectedOption() {
    if (!this._input || this._value === '') return null;
    return this._findByValue(this._value)?.source ?? null;
  }

  get control() {
    return this._input ?? null;
  }

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

  focus(options) {
    this._input?.focus(options);
  }

  open() {
    if (!this._input) return;
    this._query = '';
    this._open({ active: 'selected' });
  }

  close() {
    if (!this._input) return;
    this._settle({ reason: 'api' });
  }

  toggle() {
    if (this._isOpen) this.close();
    else this.open();
  }

  // --- Keyboard ---------------------------------------------------------------

  _handleKey(event) {
    // Keys pressed while an IME is composing belong to the IME.
    if (event.isComposing || event.keyCode === 229) return;

    const isOpen = this._isOpen;

    switch (event.key) {
      case 'ArrowDown':
        if (!isOpen && !this._canOpen()) return;
        event.preventDefault();
        if (!isOpen) {
          this._query = '';
          this._open({ active: event.altKey ? 'selected' : 'selected-or-first' });
        } else if (!event.altKey) {
          this._move(1);
        }
        return;

      case 'ArrowUp':
        if (!isOpen) {
          if (event.altKey || !this._canOpen()) return;
          event.preventDefault();
          this._query = '';
          this._open({ active: 'selected-or-last' });
          return;
        }
        event.preventDefault();
        if (event.altKey) this._settle({ acceptActive: true, reason: 'select' });
        else this._move(-1);
        return;

      case 'PageDown':
      case 'PageUp':
        if (!isOpen) return;
        event.preventDefault();
        this._move(event.key === 'PageDown' ? PAGE_STEP : -PAGE_STEP, { wrap: false });
        return;

      case 'Enter':
        // Closed, Enter is left to submit the form the way it does from any
        // other field. Free text kept by Escape is committed first, so the
        // form submits what the field shows.
        if (!isOpen) {
          this._reconcile();
          return;
        }
        event.preventDefault();
        this._choose();
        return;

      case 'Escape':
        // Closed, Escape belongs to whatever is around the field — a dialog
        // or a popover should still close on it.
        if (!isOpen) return;
        event.preventDefault();
        event.stopPropagation();
        if (!this.hasAttribute('allow-custom')) this._restoreText();
        this._close('escape');
        return;

      case 'Tab':
        // Accept the highlighted option and let focus move on.
        if (isOpen) this._settle({ acceptActive: true, reason: 'blur' });
        return;
    }
  }

  _move(delta, { wrap = true } = {}) {
    const options = this._enabledVisible();
    if (options.length === 0) return;

    const current = options.indexOf(this._active);
    let next;
    if (current === -1) {
      next = delta > 0 ? 0 : options.length - 1;
    } else if (wrap) {
      next = (current + delta + options.length) % options.length;
    } else {
      next = Math.min(Math.max(current + delta, 0), options.length - 1);
    }

    this._setActive(options[next]);
    this._activeByTyping = false;
  }

  /** Enter while the list is open. */
  _choose() {
    if (this._active) {
      this._commit(this._active);
      this._close('select');
      return;
    }

    const text = this._input.value;
    const match = this._findByLabel(text);
    if (match) {
      this._commit(match);
    } else if (this.hasAttribute('allow-custom')) {
      this._commitCustom(text);
    } else if (normalizeSpace(text) === '') {
      this._commit(null);
    } else {
      // Nothing to choose. The list stays open on its "no results" message,
      // which has already been announced.
      return;
    }
    this._close('select');
  }

  // --- Value ------------------------------------------------------------------

  /**
   * Close the list and bring the text back in line with the value: accept the
   * highlighted option, take an exact label match, keep free text when
   * allowed, or revert to the chosen option's label.
   */
  _settle({ acceptActive = false, reason = 'api' } = {}) {
    if (acceptActive && this._active) this._commit(this._active);
    else this._reconcile();
    this._close(reason);
  }

  _reconcile() {
    if (!this._dirty) return;

    const text = this._input.value;
    const match = this._findByLabel(text);
    if (match) this._commit(match);
    else if (this.hasAttribute('allow-custom')) this._commitCustom(text);
    else if (normalizeSpace(text) === '') this._commit(null);
    else this._restoreText();
  }

  _commit(record) {
    this._setValue(record?.value ?? '', record?.label ?? '', { emit: true });
  }

  _commitCustom(text) {
    const value = normalizeSpace(text);
    this._setValue(value, value, { emit: true });
  }

  _setValue(value, label, { emit }) {
    const changed = value !== this._value;
    this._value = value;
    this._label = label;
    this._dirty = false;
    this._query = '';
    this._input.value = label;
    this._hidden.value = value;
    this._syncSelected();
    if (changed && emit) this.emit('aihio-change', { value, label });
  }

  _restoreText() {
    this._dirty = false;
    this._query = '';
    this._input.value = this._label ?? '';
  }

  _restoreDefault() {
    this._label = null;
    const value = this.defaultValue;
    const changed = value !== this._value;
    this._setValue(value, this._resolveLabel(value), { emit: false });
    this._close('reset');
    if (changed) this.emit('aihio-change', { value, label: this._label });
  }

  _resolveLabel(value = this._value) {
    if (value === '') return '';
    const record = this._findByValue(value);
    if (record) return record.label;
    // Remote results come and go, so the chosen option may no longer be in the
    // list. Keep the label it had when it was chosen.
    return this._label ?? value;
  }

  _findByValue(value) {
    return this._order.find((record) => record.value === value) ?? null;
  }

  _findByLabel(text) {
    const folded = foldText(normalizeSpace(text)).text;
    if (!folded) return null;
    return this._order.find((record) => !record.disabled && record.fold.text === folded) ?? null;
  }

  _isSelected(record) {
    return this._value !== '' && record.value === this._value;
  }

  /**
   * `host.replaceChildren(...results)` and `host.innerHTML = …` are the
   * obvious way to swap in fetched options, and they take the input and the
   * list with them — usually mid-keystroke. Put the parts back and carry on
   * where the person was.
   */
  _restoreParts() {
    this.prepend(...this._parts);
    if (this._isOpen && this._supportsPopover && !this._popup.matches(':popover-open')) {
      this._popup.showPopover();
    }
    // Only take focus back if it fell to the body with the removed input, not
    // if the person has since moved it somewhere else.
    const active = document.activeElement;
    if (this._hasFocus && (!active || active === document.body)) {
      this._input.focus({ preventScroll: true });
    }
  }

  // --- Options ----------------------------------------------------------------

  _isOptionMutation(mutation) {
    const { target } = mutation;
    if (target === this) {
      return mutation.type === 'childList' &&
        [...mutation.addedNodes, ...mutation.removedNodes].some((node) => node.localName === 'aihio-option');
    }
    const element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
    return element?.closest?.('aihio-option')?.parentElement === this;
  }

  _renderOptions() {
    if (!this._input) return;

    const sources = [...this.children].filter((child) => child.localName === 'aihio-option');
    const next = new Map();

    for (const source of sources) {
      const record = this._records.get(source) ?? this._createRecord(source);
      this._updateRecord(record);
      next.set(source, record);
      if (record.el.parentNode !== this._listbox) this._listbox.append(record.el);
    }

    for (const [source, record] of this._records) {
      if (next.has(source)) continue;
      record.el.remove();
      if (this._active === record) this._setActive(null);
    }

    this._records = next;
    this._order = [...next.values()];

    const label = this._resolveLabel();
    if (label !== this._label) {
      this._label = label;
      if (!this._dirty) this._input.value = label;
    }

    this._syncSelected();
    this._applyFilter();

    if (this._isOpen) {
      if (this._activeByTyping) this._autoActivate();
      this._announceSoon();
    }
  }

  _createRecord(source) {
    const el = document.createElement('div');
    el.id = `${this._baseId}-option-${++this._optionCount}`;
    el.setAttribute('role', 'option');
    el.setAttribute('data-combobox-part', 'option');
    el.setAttribute('aria-selected', 'false');

    const labelEl = document.createElement('span');
    labelEl.setAttribute('data-combobox-part', 'option-label');
    el.append(labelEl);
    el.insertAdjacentHTML('beforeend', CHECK_ICON);

    const record = {
      source,
      el,
      labelEl,
      label: '',
      value: '',
      fold: foldText(''),
      disabled: false,
      rich: false,
      richMarkup: null,
      painted: null,
    };
    this._recordByElement.set(el, record);
    return record;
  }

  _updateRecord(record) {
    const { source } = record;
    const text = normalizeSpace(source.textContent);
    const label = normalizeSpace(source.getAttribute('label') ?? text);

    if (label !== record.label) {
      record.label = label;
      record.fold = foldText(label);
      record.painted = null;
    }
    record.value = source.getAttribute('value') ?? label;
    record.disabled = source.hasAttribute('disabled');

    if (record.disabled) record.el.setAttribute('aria-disabled', 'true');
    else record.el.removeAttribute('aria-disabled');

    // Anything beyond a plain label (an icon, a secondary line, a label that
    // differs from the text) is shown as authored, minus ids that would
    // otherwise be duplicated in the document.
    const rich = source.childElementCount > 0 || text !== label;
    if (rich) {
      const markup = source.innerHTML;
      if (!record.rich || markup !== record.richMarkup) {
        const clone = source.cloneNode(true);
        for (const element of clone.querySelectorAll('[id]')) element.removeAttribute('id');
        record.labelEl.replaceChildren(...clone.childNodes);
        record.richMarkup = markup;
      }
    } else if (record.rich) {
      record.painted = null;
    }
    record.rich = rich;
  }

  _applyFilter() {
    if (!this._input) return;

    const mode = this._filterMode();
    const query = foldText(normalizeSpace(this._query)).text;
    const ranked = [];

    this._order.forEach((record, index) => {
      let match = null;
      if (query) {
        match = findMatch(record.fold.text, query, mode === 'none' ? 'contains' : mode);
        if (!match && mode !== 'none') return;
      }
      ranked.push({ record, index, match });
    });

    // Prefix matches first, then matches at the start of a later word, then
    // anywhere; author order breaks ties. With no query the author's order
    // stands, and filter="none" leaves ordering to whoever supplies options.
    if (query && mode === 'contains') {
      ranked.sort((left, right) => left.match.rank - right.match.rank || left.index - right.index);
    }

    const visible = ranked.map(({ record }) => record);
    const shown = new Set(visible);

    for (const record of this._order) {
      const hidden = !shown.has(record);
      if (record.el.hidden !== hidden) record.el.hidden = hidden;
    }

    let cursor = this._listbox.firstElementChild;
    for (const record of visible) {
      if (record.el === cursor) cursor = cursor.nextElementSibling;
      else this._listbox.insertBefore(record.el, cursor);
    }

    for (const { record, match } of ranked) {
      paintLabel(record, match ? match.start : -1, query.length);
    }

    this._visible = visible;
    if (this._active && (!shown.has(this._active) || this._active.disabled)) this._setActive(null);

    this._syncMessage();
    if (this._isOpen) this._position();
  }

  _autoActivate() {
    // Typing highlights the best match so Enter or Tab can take it. Free text
    // is left alone: there, Enter should keep exactly what was typed.
    const first = normalizeSpace(this._query) && !this.hasAttribute('allow-custom')
      ? this._enabledVisible()[0] ?? null
      : null;
    this._setActive(first);
    this._activeByTyping = true;
  }

  _enabledVisible() {
    return this._visible.filter((record) => !record.disabled);
  }

  _setActive(record, { scroll = true } = {}) {
    if (this._active !== record) {
      this._active?.el.removeAttribute('data-active');
      this._active = record;
      if (record) {
        record.el.setAttribute('data-active', '');
        this._input.setAttribute('aria-activedescendant', record.el.id);
      } else {
        this._input.removeAttribute('aria-activedescendant');
      }
    }
    if (record && scroll) this._scrollIntoView(record.el);
  }

  _syncSelected() {
    for (const record of this._order) {
      record.el.setAttribute('aria-selected', String(this._isSelected(record)));
    }
  }

  _recordFromEvent(event) {
    const el = event.target?.closest?.('[role="option"]');
    return el ? this._recordByElement.get(el) ?? null : null;
  }

  _filterMode() {
    const mode = this.getAttribute('filter');
    return mode === 'starts-with' || mode === 'none' ? mode : 'contains';
  }

  // --- Popup --------------------------------------------------------------------

  _canOpen() {
    return Boolean(this._input) && !this._input.matches(':disabled') && !this._input.readOnly;
  }

  _open({ active = 'selected' } = {}) {
    if (!this._canOpen()) return;
    if (this._isOpen) {
      this._applyFilter();
      this._activateInitial(active);
      return;
    }
    this._pendingActive = active;
    this.setAttribute('open', '');
  }

  _close(reason) {
    if (!this.hasAttribute('open')) return;
    this._closeReason = reason;
    this.removeAttribute('open');
  }

  _show() {
    if (!this.isConnected || !this._canOpen()) {
      this.removeAttribute('open');
      return;
    }

    this._isOpen = true;
    if (this._supportsPopover) {
      if (!this._popup.matches(':popover-open')) this._popup.showPopover();
    } else {
      this._popup.setAttribute('data-fallback-open', '');
    }

    this._input.setAttribute('aria-expanded', 'true');
    this._toggle.setAttribute('aria-expanded', 'true');

    window.addEventListener('resize', this._onViewportChange);
    window.addEventListener('scroll', this._onViewportChange, true);
    window.visualViewport?.addEventListener('resize', this._onViewportChange);
    window.visualViewport?.addEventListener('scroll', this._onViewportChange);

    this._applyFilter();
    this._activateInitial(this._pendingActive ?? 'selected');
    this._pendingActive = null;
    this.emit('aihio-open');
  }

  _hide() {
    this._teardownPopup();
    this.emit('aihio-close', { reason: this._closeReason ?? 'attribute' });
    this._closeReason = null;
  }

  _teardownPopup() {
    this._isOpen = false;
    if (this._supportsPopover && this._popup.matches(':popover-open')) this._popup.hidePopover();
    this._popup.removeAttribute('data-fallback-open');

    this._setActive(null);
    this._activeByTyping = false;
    this._input.setAttribute('aria-expanded', 'false');
    this._toggle.setAttribute('aria-expanded', 'false');

    clearTimeout(this._statusTimer);
    this._status.textContent = '';

    window.removeEventListener('resize', this._onViewportChange);
    window.removeEventListener('scroll', this._onViewportChange, true);
    window.visualViewport?.removeEventListener('resize', this._onViewportChange);
    window.visualViewport?.removeEventListener('scroll', this._onViewportChange);
  }

  _activateInitial(target) {
    if (target === 'none') {
      this._setActive(null);
      return;
    }

    const options = this._enabledVisible();
    const selected = options.find((record) => this._isSelected(record)) ?? null;
    if (target === 'selected-or-first') this._setActive(selected ?? options[0] ?? null);
    else if (target === 'selected-or-last') this._setActive(selected ?? options.at(-1) ?? null);
    else this._setActive(selected);
    this._activeByTyping = false;
  }

  _position() {
    if (!this._isOpen) return;

    const popup = this._popup;
    const anchor = this.getBoundingClientRect();
    const view = visibleArea();

    popup.style.setProperty('--aihio-combobox-anchor-width', `${Math.round(anchor.width)}px`);
    popup.style.removeProperty('--aihio-combobox-available-height');
    const natural = popup.getBoundingClientRect();

    // Open downward unless the list would be cut short there and there is
    // more room above — the usual case for a field near the bottom of the
    // screen, or above an on-screen keyboard.
    const below = view.bottom - anchor.bottom - POPUP_GAP - VIEWPORT_EDGE;
    const above = anchor.top - view.top - POPUP_GAP - VIEWPORT_EDGE;
    const placeBelow = natural.height <= below || below >= above;
    const room = Math.max(Math.floor(placeBelow ? below : above), 0);
    popup.style.setProperty('--aihio-combobox-available-height', `${room}px`);

    const height = Math.min(natural.height, room);
    const top = placeBelow ? anchor.bottom + POPUP_GAP : anchor.top - POPUP_GAP - height;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const minLeft = view.left + VIEWPORT_EDGE;
    const maxLeft = Math.max(minLeft, view.right - natural.width - VIEWPORT_EDGE);
    const left = Math.min(Math.max(rtl ? anchor.right - natural.width : anchor.left, minLeft), maxLeft);

    popup.style.top = `${Math.round(top)}px`;
    popup.style.left = `${Math.round(left)}px`;
    popup.dataset.side = placeBelow ? 'bottom' : 'top';
  }

  _scrollIntoView(element) {
    const scroller = this._popup;
    if (!this._isOpen || scroller.scrollHeight <= scroller.clientHeight) return;

    const box = scroller.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const inset = parseFloat(getComputedStyle(scroller).paddingTop) || 0;

    if (rect.top < box.top + inset) {
      scroller.scrollTop -= box.top + inset - rect.top;
    } else if (rect.bottom > box.bottom - inset) {
      scroller.scrollTop += rect.bottom - (box.bottom - inset);
    }
  }

  _syncMessage() {
    const loading = this.hasAttribute('loading');
    const empty = this._visible.length === 0;
    const text = loading ? this._loadingText() : empty ? this._emptyText() : '';

    if (this._message.textContent !== text) this._message.textContent = text;
    this._message.hidden = text === '';
    this._message.toggleAttribute('data-loading', loading);
    this._listbox.hidden = empty;

    if (loading) this._listbox.setAttribute('aria-busy', 'true');
    else this._listbox.removeAttribute('aria-busy');
  }

  _announceSoon() {
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => {
      if (this._isOpen) this._status.textContent = this._statusText();
    }, STATUS_DELAY);
  }

  _statusText() {
    if (this.hasAttribute('loading')) return this._loadingText();
    const count = this._visible.length;
    if (count === 0) return this._emptyText();
    const template = this.getAttribute('results-text');
    if (template) return template.replaceAll('{count}', String(count));
    return count === 1 ? '1 result' : `${count} results`;
  }

  _emptyText() {
    return this.getAttribute('empty-text') || 'No results';
  }

  _loadingText() {
    return this.getAttribute('loading-text') || 'Loading…';
  }

  // --- Wiring ---------------------------------------------------------------------

  _syncLabelling() {
    for (const name of ['aria-label', 'aria-labelledby', 'aria-describedby']) {
      mirrorAttribute(this, this._input, name);
    }

    // The listbox and the toggle button carry the field's name, so a screen
    // reader announces "Country, button, collapsed" rather than an unnamed
    // button.
    const labelledBy = this.getAttribute('aria-labelledby');
    const label = labelledBy ? null : this.getAttribute('aria-label');
    for (const element of [this._listbox, this._toggle]) {
      setOrRemove(element, 'aria-labelledby', labelledBy);
      setOrRemove(element, 'aria-label', label);
    }
  }

  _syncFormListener() {
    const form = this._hidden?.form ?? null;
    if (form === this._form) return;
    this._detachForm();
    this._form = form;
    this._form?.addEventListener('reset', this._onReset);
  }

  _detachForm() {
    this._form?.removeEventListener('reset', this._onReset);
    this._form = null;
  }
}

export class AihioOption extends AihioElement {
  static tag = 'aihio-option';

  /** Submitted value; falls back to the label. */
  get value() {
    return this.getAttribute('value') ?? this.label;
  }

  set value(value) {
    this.setAttribute('value', String(value ?? ''));
  }

  /** Text shown in the field once chosen, and the text typing is matched against. */
  get label() {
    return normalizeSpace(this.getAttribute('label') ?? this.textContent);
  }

  set label(value) {
    this.setAttribute('label', String(value ?? ''));
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** Whether the owning combobox currently has this option chosen. */
  get selected() {
    const owner = this.parentElement;
    return owner?.localName === 'aihio-combobox' && owner.selectedOption === this;
  }
}

function createPart(tag, part, attributes = {}) {
  const element = document.createElement(tag);
  element.setAttribute('data-combobox-part', part);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

function mirrorAttribute(host, target, name) {
  setOrRemove(target, name, host.getAttribute(name));
}

function setOrRemove(element, name, value) {
  if (value === null || value === undefined) {
    element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
}

function normalizeSpace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Case- and accent-insensitive form of `value` ("Åland" → "aland"), with a
 * map from each folded code unit back to the span of the original string it
 * came from, so a match found in the folded text can be highlighted in the
 * text as written.
 */
function foldText(value) {
  let text = '';
  const starts = [];
  const ends = [];
  let offset = 0;
  let previous = -1;

  for (const character of value) {
    const folded = character.normalize('NFD').replace(COMBINING_MARK, '').toLowerCase();
    if (folded) {
      previous = text.length;
      for (let unit = 0; unit < folded.length; unit += 1) {
        starts.push(offset);
        ends.push(offset + character.length);
      }
      text += folded;
    } else if (previous !== -1) {
      // A lone combining mark folds to nothing. Attach it to the character it
      // decorates, so a highlight never splits a letter from its accent.
      for (let unit = previous; unit < ends.length; unit += 1) ends[unit] = offset + character.length;
    }
    offset += character.length;
  }

  return { text, starts, ends };
}

function findMatch(text, query, mode) {
  if (text.startsWith(query)) return { rank: 0, start: 0 };
  if (mode === 'starts-with') return null;

  const first = text.indexOf(query);
  for (let at = first; at !== -1; at = text.indexOf(query, at + 1)) {
    if (!WORD_CHARACTER.test(text[at - 1])) return { rank: 1, start: at };
  }
  return first === -1 ? null : { rank: 2, start: first };
}

function paintLabel(record, start, length) {
  if (record.rich) return;

  const key = start < 0 ? '' : `${start}:${length}`;
  if (record.painted === key) return;
  record.painted = key;

  const { label, fold } = record;
  if (start < 0 || length === 0) {
    record.labelEl.textContent = label;
    return;
  }

  const from = fold.starts[start];
  const to = fold.ends[start + length - 1];
  const mark = document.createElement('mark');
  mark.textContent = label.slice(from, to);
  record.labelEl.replaceChildren(label.slice(0, from), mark, label.slice(to));
}

function visibleArea() {
  const viewport = window.visualViewport;
  if (!viewport) {
    return { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };
  }
  return {
    top: viewport.offsetTop,
    left: viewport.offsetLeft,
    right: viewport.offsetLeft + viewport.width,
    bottom: viewport.offsetTop + viewport.height,
  };
}
