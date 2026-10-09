import { AihioElement } from '../base.js';
import { CalendarGrid, adoptProperty, firstDayAttribute, isDateDisabledBy } from '../calendar-grid.js';
import { calendarLocale, endOfMonth, fromUtcDate, parseIsoDate, toUtcDate, today } from '../dates.js';

let datePickerInstanceId = 0;

const VIEWPORT_EDGE = 8;
const POPUP_GAP = 4;

const CALENDAR_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><rect x="2.25" y="3.25" width="11.5" height="10.5" rx="1.75" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.25 6.75h11.5M5.25 1.75v3M10.75 1.75v3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

const DEFAULT_TEXT = {
  'choose-text': 'Choose date',
  'previous-month-text': 'Previous month',
  'next-month-text': 'Next month',
  'invalid-text': 'Enter a date as {format}.',
  'min-text': 'Choose {min} or later.',
  'max-text': 'Choose {max} or earlier.',
  'unavailable-text': '{date} is not available.',
};

/**
 * A field for one date. It is typed in the page's language (9.10.2026 in
 * Finland, 10/9/2026 in the US, 2026-10-09 anywhere), or picked from a month
 * grid that a button opens under the field, and it submits as YYYY-MM-DD, as
 * a native date input does, through a hidden input under name.
 *
 * The popup is the WAI-ARIA date picker dialog, without the modality: focus
 * moves into the grid, Escape closes it and focus goes back to where it came
 * from, and focus leaving the field closes it too.
 */
export class AihioDatePicker extends AihioElement {
  static tag = 'aihio-date-picker';
  static schemaVersion = '1.0.0';
  static observedAttributes = [
    'value',
    'name',
    'form',
    'min',
    'max',
    'placeholder',
    'disabled',
    'readonly',
    'required',
    'error',
    'size',
    'open',
    'autocomplete',
    'first-day-of-week',
    'choose-text',
    'previous-month-text',
    'next-month-text',
    'invalid-text',
    'min-text',
    'max-text',
    'unavailable-text',
    'lang',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
  ];

  setup() {
    adoptProperty(this, 'value');
    adoptProperty(this, 'isDateDisabled');

    this._baseId = `aihio-date-picker-${++datePickerInstanceId}`;
    this._isOpen = false;
    this._opener = null;
    this._focusOnOpen = false;
    this._closeReason = null;
    this._closeOnConnect = false;
    this._dirty = false;
    this._authorValidity = '';
    this._formattedIn = null;
    this._form = null;
    // The calendar is built the first time it opens, so a page with a date
    // field in every row of a table pays for one input and one button each.
    this._grid = null;
    this._supportsPopover = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;

    // A clone of an upgraded picker carries the parts the original rendered.
    for (const stale of this.querySelectorAll(':scope > [data-date-picker-part]')) stale.remove();

    this._input = createPart('input', 'input', {
      id: `${this._baseId}-input`,
      type: 'text',
      autocapitalize: 'off',
      spellcheck: 'false',
    });

    this._toggle = createPart('button', 'toggle', {
      type: 'button',
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      'aria-controls': `${this._baseId}-popup`,
      'aria-describedby': `${this._baseId}-toggle-value`,
    });
    this._toggle.innerHTML = CALENDAR_ICON;
    this._toggleLabel = createPart('span', 'toggle-label', { id: `${this._baseId}-toggle-label` });
    // The button describes itself with the chosen date in words, so wherever
    // focus comes back to it, it says what is chosen.
    this._toggleValue = createPart('span', 'toggle-value', { id: `${this._baseId}-toggle-value`, hidden: '' });
    this._toggle.append(this._toggleLabel, this._toggleValue);

    // The date submits as YYYY-MM-DD, not as the text on show, so it travels
    // in a hidden input under the author's name.
    this._hidden = createPart('input', 'value', { type: 'hidden' });

    this._popup = createPart('div', 'popup', { id: `${this._baseId}-popup`, role: 'dialog' });
    if (this._supportsPopover) this._popup.setAttribute('popover', 'manual');

    this.prepend(this._input, this._toggle, this._hidden, this._popup);

    this._value = parseIsoDate(this._pendingValue ?? this.getAttribute('value')) ?? '';
    this._pendingValue = undefined;
    this._hidden.value = this._value;
    this._showValue();

    this._onInput = () => {
      this._dirty = true;
      if (!this._isOpen) return;
      // An open calendar follows the typing.
      const date = this._parse(this._input.value);
      if (!date) return;
      this._grid.selected = date;
      if (this._grid.show(date)) this._emitMonth(this._grid.view);
      this._grid.render();
    };

    this._onChange = () => this._commitText();

    this._onInputKeyDown = (event) => {
      // Keys pressed while an IME is composing belong to the IME.
      if (event.isComposing || event.keyCode === 229) return;

      if (event.key === 'ArrowDown' && event.altKey) {
        event.preventDefault();
        this._commitText();
        this._open({ focus: true, opener: this._input });
      } else if (event.key === 'Enter') {
        // Closed, Enter submits the form as from any other field, so the text
        // is committed first and the form submits the date the field shows.
        this._commitText();
        if (this._isOpen) {
          event.preventDefault();
          this._close('select');
        }
      } else if (event.key === 'Escape' && this._isOpen) {
        // Closed, Escape belongs to whatever is around the field: a dialog or
        // a popover should still close on it.
        event.preventDefault();
        event.stopPropagation();
        this._close('escape');
      }
    };

    this._onToggleClick = () => {
      if (this._isOpen) this._close('toggle');
      else this._open({ focus: true, opener: this._toggle });
    };

    this._onPopupKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      this._close('escape');
    };

    // A press on anything in the popup that does not take focus (its padding,
    // a weekday, a day of the next month) would take focus out to the page.
    this._onPopupMouseDown = (event) => {
      if (!event.target.closest?.('button, select, [tabindex]')) event.preventDefault();
    };

    // Focus that leaves for another element closes the calendar. Focus that
    // leaves the window (another app, devtools) keeps it, to come back to.
    this._onFocusOut = (event) => {
      if (this._isOpen && event.relatedTarget && !this.contains(event.relatedTarget)) this._close('blur');
    };

    this._onOutsidePointerDown = (event) => {
      if (!event.composedPath().includes(this)) this._close('outside');
    };

    this._onViewportChange = (event) => {
      if (event?.target === this._popup) return;
      this._position();
    };

    // Reset restores native controls after the reset event has dispatched,
    // so wait for the task to finish before reading the default back.
    this._onReset = () => setTimeout(() => this._restoreDefault(), 0);

    this._input.addEventListener('input', this._onInput);
    this._input.addEventListener('change', this._onChange);
    this._input.addEventListener('keydown', this._onInputKeyDown);
    this._toggle.addEventListener('click', this._onToggleClick);
    this._popup.addEventListener('keydown', this._onPopupKeyDown);
    this._popup.addEventListener('mousedown', this._onPopupMouseDown);
    this.addEventListener('focusout', this._onFocusOut);
  }

  connect() {
    // Moving the element in the DOM should not pop the calendar open again.
    if (this._closeOnConnect && this.hasAttribute('open')) this.removeAttribute('open');
    this._closeOnConnect = false;
  }

  disconnect() {
    this._grid?.silence();
    this._detachForm();
    if (this._isOpen) {
      this._teardownPopup();
      this._closeOnConnect = true;
    }
  }

  syncAttribute(name, _oldValue, newValue) {
    if (name === 'value' && this._input) this._setValue(parseIsoDate(newValue) ?? '', { emit: false });
  }

  sync() {
    if (!this._input) return;

    const input = this._input;
    const disabled = this.hasAttribute('disabled');
    const readOnly = this.hasAttribute('readonly');
    const required = this.hasAttribute('required');
    const locale = this._locale();
    const placeholder = this.getAttribute('placeholder') ?? locale.pattern;

    if (input.disabled !== disabled) input.disabled = disabled;
    if (input.readOnly !== readOnly) input.readOnly = readOnly;
    if (input.required !== required) input.required = required;
    if (input.placeholder !== placeholder) input.placeholder = placeholder;
    input.setAttribute('aria-invalid', String(this.hasAttribute('error')));
    // The browser's list of past entries would open on top of the calendar.
    setOrRemove(input, 'autocomplete', this.getAttribute('autocomplete') ?? 'off');

    this._hidden.disabled = disabled;
    mirrorAttribute(this, this._hidden, 'name');
    mirrorAttribute(this, this._hidden, 'form');
    mirrorAttribute(this, input, 'form');
    this._toggle.disabled = disabled || readOnly;

    // The date is written in the page's language, so when that changes, so
    // does the field. Text that is not a date stays as it was typed.
    if (this._formattedIn !== locale.tag && this._value && !this._dirty) this._showValue();

    this._syncLabelling();
    this._syncFormListener();
    this._validate();

    const wantsOpen = this.hasAttribute('open');
    if (wantsOpen && !this._isOpen) {
      this._show();
    } else if (!wantsOpen && this._isOpen) {
      this._hide();
    } else if (this._isOpen) {
      if (!this._canOpen()) {
        this._close('disabled');
      } else {
        this._configureGrid();
        this._grid.render();
        this._position();
      }
    }
  }

  // --- Public API -----------------------------------------------------------

  /** The date as YYYY-MM-DD, or "". Anything that is not a date clears it, as with a native date input. */
  get value() {
    return this._input ? this._value : parseIsoDate(this._pendingValue ?? this.getAttribute('value')) ?? '';
  }

  set value(next) {
    const value = parseIsoDate(next) ?? '';
    if (!this._input) {
      this._pendingValue = value;
      return;
    }
    this._setValue(value, { emit: false });
  }

  get defaultValue() {
    return this.getAttribute('value') ?? '';
  }

  set defaultValue(value) {
    this.setAttribute('value', String(value ?? ''));
  }

  /** The date as the UTC midnight it starts at, or null, as a native date input has it. */
  get valueAsDate() {
    return this.value ? toUtcDate(this.value) : null;
  }

  set valueAsDate(date) {
    this.value = fromUtcDate(date) ?? '';
  }

  /** Called with each date shown, as YYYY-MM-DD; a date it returns true for cannot be chosen. */
  get isDateDisabled() {
    return this._isDateDisabled ?? null;
  }

  set isDateDisabled(check) {
    this._isDateDisabled = typeof check === 'function' ? check : null;
    if (!this._input) return;
    this._validate();
    if (this._isOpen) {
      this._configureGrid();
      this._grid.render();
    }
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

  /** A message of your own wins over the field's; an empty one hands back to it. */
  setCustomValidity(message) {
    this._authorValidity = String(message ?? '');
    this._validate();
  }

  focus(options) {
    if (this._input) this._input.focus(options);
    else super.focus(options);
  }

  /** Open the calendar and move focus into it; it comes back to whatever had it. */
  open() {
    if (!this._input) return;
    const active = document.activeElement;
    const opener = active && active !== document.body && !this._popup.contains(active) ? active : this._toggle;
    this._open({ focus: true, opener });
  }

  close() {
    if (this._input) this._close('api');
  }

  toggle() {
    if (this._isOpen) this.close();
    else this.open();
  }

  // --- Value ------------------------------------------------------------------

  _commitText() {
    if (!this._dirty) return;
    const text = this._input.value.trim();
    const date = text ? this._parse(text) : '';
    // Text that is not a date is kept, to be corrected rather than typed
    // again, and the field is invalid until it is.
    if (date === null) this._setValue('', { emit: true, keepText: true });
    else this._setValue(date, { emit: true });
  }

  _pick(date) {
    this._setValue(date, { emit: true });
    this._close('select');
  }

  _setValue(value, { emit, keepText = false }) {
    const changed = value !== this._value;
    this._value = value;
    this._hidden.value = value;
    this._dirty = false;
    if (keepText) this._toggleValue.textContent = '';
    else this._showValue();
    if (this._grid) {
      this._grid.selected = value;
      if (this._isOpen) this._grid.render();
    }
    this._validate();
    if (changed && emit) this.emit('aihio-change', { value });
  }

  _showValue() {
    const locale = this._locale();
    this._formattedIn = locale.tag;
    this._input.value = this._value ? locale.formatDate(this._value) : '';
    this._toggleValue.textContent = this._value ? locale.formatLong(this._value) : '';
  }

  _restoreDefault() {
    const value = parseIsoDate(this.defaultValue) ?? '';
    const changed = value !== this._value;
    this._setValue(value, { emit: false });
    this._close('reset');
    if (changed) this.emit('aihio-change', { value });
  }

  /**
   * The field's own validity: text that is not a date, a date outside min
   * and max, or one isDateDisabled rules out. The date stays the value in the
   * last two cases, as a native date input keeps a date outside its range,
   * and the form will not submit until it changes.
   */
  _validate() {
    const locale = this._locale();
    const value = this._value;
    let message = '';
    if (!value) {
      if (!this._dirty && this._input.value.trim() !== '') {
        message = this._text('invalid-text').replaceAll('{format}', locale.pattern);
      }
    } else {
      const { min, max } = this._range();
      if (min && value < min) message = this._text('min-text').replaceAll('{min}', locale.formatDate(min));
      else if (max && value > max) message = this._text('max-text').replaceAll('{max}', locale.formatDate(max));
      else if (isDateDisabledBy(this._isDateDisabled, value)) {
        message = this._text('unavailable-text').replaceAll('{date}', locale.formatDate(value));
      }
    }
    this._input.setCustomValidity(this._authorValidity || message);
  }

  _parse(text) {
    return this._locale().parse(text, today());
  }

  _range() {
    return {
      min: parseIsoDate(this.getAttribute('min')) ?? '',
      max: parseIsoDate(this.getAttribute('max')) ?? '',
    };
  }

  _lang() {
    return this.closest('[lang]')?.getAttribute('lang') || undefined;
  }

  _locale() {
    return calendarLocale(this._lang());
  }

  _text(name) {
    return this.getAttribute(name) || DEFAULT_TEXT[name];
  }

  _emitMonth(first) {
    this.emit('aihio-month', { month: first.slice(0, 7), start: first, end: endOfMonth(first) });
  }

  // --- Popup --------------------------------------------------------------------

  _canOpen() {
    return Boolean(this._input) && !this._input.matches(':disabled') && !this._input.readOnly;
  }

  _open({ focus = false, opener = null } = {}) {
    if (!this._canOpen()) return;
    this._opener = opener;
    if (this._isOpen) {
      if (focus) this._grid.focus({ preventScroll: true });
      return;
    }
    this._focusOnOpen = focus;
    this.setAttribute('open', '');
  }

  _close(reason) {
    if (!this.hasAttribute('open')) return;
    this._closeReason = reason;
    // Focus in the calendar goes back where it came from before the calendar
    // is hidden, so it never falls to the page.
    if (this._popup.contains(document.activeElement)) {
      const opener = this._opener;
      const target = opener?.isConnected && !opener.matches(':disabled') ? opener : this._input;
      target.focus({ preventScroll: true });
    }
    this.removeAttribute('open');
  }

  _ensureGrid() {
    if (this._grid) return;
    this._grid = new CalendarGrid({
      id: this._baseId,
      onSelect: (date) => this._pick(date),
      onMonth: (month) => this._emitMonth(month),
    });
    this._popup.append(this._grid.element);
  }

  _configureGrid() {
    const { min, max } = this._range();
    this._grid.configure({
      lang: this._lang(),
      min,
      max,
      firstDay: firstDayAttribute(this),
      isDateDisabled: this._isDateDisabled,
      previousText: this._text('previous-month-text'),
      nextText: this._text('next-month-text'),
    });
  }

  _show() {
    if (!this.isConnected || !this._canOpen()) {
      this.removeAttribute('open');
      return;
    }

    this._isOpen = true;
    this._ensureGrid();
    this._configureGrid();
    // Open on the date in the field, even one typed and not yet committed,
    // or else on today.
    const shown = (this._dirty && this._parse(this._input.value)) || this._value;
    this._grid.selected = shown;
    this._grid.show(shown);
    this._grid.render();

    if (this._supportsPopover) {
      if (!this._popup.matches(':popover-open')) this._popup.showPopover();
    } else {
      this._popup.setAttribute('data-fallback-open', '');
    }
    this._toggle.setAttribute('aria-expanded', 'true');

    window.addEventListener('resize', this._onViewportChange);
    window.addEventListener('scroll', this._onViewportChange, true);
    window.visualViewport?.addEventListener('resize', this._onViewportChange);
    window.visualViewport?.addEventListener('scroll', this._onViewportChange);
    document.addEventListener('pointerdown', this._onOutsidePointerDown, true);

    this._position();
    if (this._focusOnOpen) this._grid.focus({ preventScroll: true });
    this._focusOnOpen = false;
    this.emit('aihio-open');
    this._emitMonth(this._grid.view);
  }

  _hide() {
    this._teardownPopup();
    this.emit('aihio-close', { reason: this._closeReason ?? 'attribute' });
    this._closeReason = null;
  }

  _teardownPopup() {
    this._isOpen = false;
    this._grid?.silence();
    if (this._supportsPopover && this._popup.matches(':popover-open')) this._popup.hidePopover();
    this._popup.removeAttribute('data-fallback-open');
    this._toggle.setAttribute('aria-expanded', 'false');

    window.removeEventListener('resize', this._onViewportChange);
    window.removeEventListener('scroll', this._onViewportChange, true);
    window.visualViewport?.removeEventListener('resize', this._onViewportChange);
    window.visualViewport?.removeEventListener('scroll', this._onViewportChange);
    document.removeEventListener('pointerdown', this._onOutsidePointerDown, true);
  }

  /**
   * Under the field, or above it when there is more room there: a field near
   * the bottom of the screen, or above an on-screen keyboard. Aligned with
   * the field's start edge and kept inside the visual viewport.
   */
  _position() {
    if (!this._isOpen) return;

    const popup = this._popup;
    const anchor = this.getBoundingClientRect();
    const view = visibleArea();

    popup.style.removeProperty('--aihio-date-picker-available-height');
    const natural = popup.getBoundingClientRect();

    const below = view.bottom - anchor.bottom - POPUP_GAP - VIEWPORT_EDGE;
    const above = anchor.top - view.top - POPUP_GAP - VIEWPORT_EDGE;
    const placeBelow = natural.height <= below || below >= above;
    const room = Math.max(Math.floor(placeBelow ? below : above), 0);
    popup.style.setProperty('--aihio-date-picker-available-height', `${room}px`);

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

  // --- Wiring ---------------------------------------------------------------------

  _syncLabelling() {
    for (const name of ['aria-label', 'aria-labelledby', 'aria-describedby']) {
      mirrorAttribute(this, this._input, name);
    }

    const choose = this._text('choose-text');
    if (this._toggleLabel.textContent !== choose) this._toggleLabel.textContent = choose;

    // The button and the calendar take the field's name after their own, so
    // a start date and an end date are not two identical "Choose date"
    // buttons in a screen reader's list of them.
    const labelledBy = this.getAttribute('aria-labelledby');
    const label = labelledBy ? null : this.getAttribute('aria-label');
    const ids = labelledBy ? `${this._toggleLabel.id} ${labelledBy}` : null;
    const name = label ? `${choose}, ${label}` : null;
    setOrRemove(this._toggle, 'aria-labelledby', ids);
    setOrRemove(this._toggle, 'aria-label', name);
    setOrRemove(this._popup, 'aria-labelledby', ids);
    setOrRemove(this._popup, 'aria-label', ids ? null : name ?? choose);
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
}

function createPart(tag, part, attributes = {}) {
  const element = document.createElement(tag);
  element.setAttribute('data-date-picker-part', part);
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
