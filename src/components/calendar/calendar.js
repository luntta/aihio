import { AihioElement } from '../base.js';
import { CalendarGrid, adoptProperty, firstDayAttribute } from '../calendar-grid.js';
import { endOfMonth, fromUtcDate, parseIsoDate, toUtcDate } from '../dates.js';

let calendarInstanceId = 0;

/**
 * A month grid on the page, for choosing a date where the choice is the
 * point of the page: a booking day, a delivery slot. The chosen date submits
 * as YYYY-MM-DD under name, through a hidden input, as aihio-combobox submits
 * its value. For a date typed into a form field, use aihio-date-picker, which
 * opens the same grid under a field.
 */
export class AihioCalendar extends AihioElement {
  static tag = 'aihio-calendar';
  static schemaVersion = '1.0.0';
  static observedAttributes = [
    'value',
    'name',
    'form',
    'min',
    'max',
    'disabled',
    'readonly',
    'first-day-of-week',
    'previous-month-text',
    'next-month-text',
    'lang',
  ];

  setup() {
    adoptProperty(this, 'value');
    adoptProperty(this, 'isDateDisabled');

    // A clone of an upgraded calendar carries the parts the original rendered.
    for (const stale of this.querySelectorAll(':scope > [data-calendar-part]')) stale.remove();

    this._grid = new CalendarGrid({
      id: `aihio-calendar-${++calendarInstanceId}`,
      onSelect: (date) => this._choose(date),
      onMonth: (month) => this._emitMonth(month),
    });
    this._hidden = document.createElement('input');
    this._hidden.type = 'hidden';
    this._hidden.setAttribute('data-calendar-part', 'value');
    this.append(this._grid.element, this._hidden);

    this._value = parseIsoDate(this._pendingValue ?? this.getAttribute('value')) ?? '';
    this._pendingValue = undefined;
    this._hidden.value = this._value;
    this._grid.selected = this._value;
    this._form = null;

    // Reset restores native controls after the reset event has dispatched, so
    // wait for the task to finish before reading the default back.
    this._onReset = () => setTimeout(() => this._restoreDefault(), 0);
  }

  disconnect() {
    this._grid?.silence();
    this._detachForm();
  }

  syncAttribute(name, _oldValue, newValue) {
    if (name !== 'value' || !this._grid) return;
    this._setValue(parseIsoDate(newValue) ?? '', { show: true });
  }

  sync() {
    if (!this._grid) return;

    const disabled = this.hasAttribute('disabled');
    // The calendar is one control: a group, named by its label, holding the
    // month controls and the grid.
    if (this.getAttribute('role') !== 'group') this.setAttribute('role', 'group');
    this.setAria('disabled', disabled ? 'true' : null);

    this._grid.configure({
      lang: this.closest('[lang]')?.getAttribute('lang') || undefined,
      min: parseIsoDate(this.getAttribute('min')) ?? '',
      max: parseIsoDate(this.getAttribute('max')) ?? '',
      firstDay: firstDayAttribute(this),
      isDateDisabled: this._isDateDisabled,
      previousText: this.getAttribute('previous-month-text') || 'Previous month',
      nextText: this.getAttribute('next-month-text') || 'Next month',
      disabled,
      readOnly: this.hasAttribute('readonly'),
    });
    this._grid.render();

    this._hidden.disabled = disabled;
    mirrorAttribute(this, this._hidden, 'name');
    mirrorAttribute(this, this._hidden, 'form');
    this._syncFormListener();
  }

  // --- Public API -----------------------------------------------------------

  /** The chosen date as YYYY-MM-DD, or "". Anything that is not a date clears it, as with a native date input. */
  get value() {
    return this._grid ? this._value : parseIsoDate(this._pendingValue ?? this.getAttribute('value')) ?? '';
  }

  set value(next) {
    const value = parseIsoDate(next) ?? '';
    if (!this._grid) {
      this._pendingValue = value;
      return;
    }
    this._setValue(value, { show: true });
  }

  get defaultValue() {
    return this.getAttribute('value') ?? '';
  }

  set defaultValue(value) {
    this.setAttribute('value', String(value ?? ''));
  }

  /** The chosen date as the UTC midnight it starts at, or null, as a native date input has it. */
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
    if (!this._grid) return;
    this._grid.configure({ isDateDisabled: this._isDateDisabled });
    this._grid.render();
  }

  /** The month shown, as YYYY-MM. Setting it shows that month without choosing a date. */
  get month() {
    return this._grid?.view.slice(0, 7) ?? (this.value || '').slice(0, 7);
  }

  set month(month) {
    const date = parseIsoDate(`${month}-01`);
    if (!date || !this._grid) return;
    if (this._grid.show(date)) this._emitMonth(this._grid.view);
    this._grid.render();
  }

  /** The form the date submits with, or null outside one. */
  get form() {
    return this._hidden?.form ?? null;
  }

  /** Focus the grid's tab stop: the chosen date, or else today. */
  focus(options) {
    if (this._grid) this._grid.focus(options);
    else super.focus(options);
  }

  // --- Value ------------------------------------------------------------------

  _choose(date) {
    // A <fieldset disabled> disables the hidden input but not the grid, which
    // is not a form control.
    if (this._hidden.matches(':disabled')) return;
    const changed = date !== this._value;
    this._setValue(date, { show: false });
    if (changed) this.emit('aihio-change', { value: date });
  }

  _setValue(value, { show }) {
    this._value = value;
    this._hidden.value = value;
    this._grid.selected = value;
    if (show && value && this._grid.show(value) && this.isConnected) this._emitMonth(this._grid.view);
    this._grid.render();
  }

  _restoreDefault() {
    const value = parseIsoDate(this.defaultValue) ?? '';
    const changed = value !== this._value;
    this._setValue(value, { show: true });
    if (changed) this.emit('aihio-change', { value });
  }

  _emitMonth(first) {
    this.emit('aihio-month', { month: first.slice(0, 7), start: first, end: endOfMonth(first) });
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

function mirrorAttribute(host, target, name) {
  const value = host.getAttribute(name);
  if (value === null) target.removeAttribute(name);
  else if (target.getAttribute(name) !== value) target.setAttribute(name, value);
}
