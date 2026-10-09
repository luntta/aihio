// The month grid, shared by aihio-calendar and the popup of aihio-date-picker.
//
// It is the grid of the WAI-ARIA date picker: a <table role="grid"> of the
// month's days, one of them a tab stop, where the arrow keys move a day or a
// week, Home and End go to the ends of the week, and Page Up and Page Down
// move a month (a year with Shift). Each day is named by its full date, so a
// move into another month says so, and carries aria-selected,
// aria-current="date", and aria-disabled for the states it is drawn in. Above
// the grid, buttons step a month at a time, and native selects jump to any
// month or year: a birth year is one choice away, and a wheel on a phone.
//
// It renders and handles input; what choosing a date does is its owner's.

import {
  addDays,
  addMonths,
  calendarLocale,
  clampDate,
  dateParts,
  daysInMonth,
  endOfMonth,
  isoDate,
  startOfMonth,
  today,
  weekday,
} from './dates.js';

/** first-day-of-week values, by the day of the week each one is (0 for Sunday). */
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// A month spans at most six weeks. Six are always laid out, the days of the
// months either side filling those it does not need, so the grid is the same
// height every month and nothing around it moves.
const WEEKS = 6;

// The years offered around this one where min and max do not bound them:
// enough back for a birth date, and on for an expiry or a renewal.
const YEARS_BACK = 100;
const YEARS_ON = 50;

// A month step is announced once the grid shows the new month.
const STATUS_DELAY = 100;

const CHEVRON = {
  previous: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M10 4L6 8l4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/**
 * Whether `isDateDisabled` rules a date out. A function that throws is
 * reported and treated as allowing the date, so one bad date does not take
 * the calendar down with it.
 */
export function isDateDisabledBy(isDateDisabled, date) {
  if (typeof isDateDisabled !== 'function') return false;
  try {
    return Boolean(isDateDisabled(date));
  } catch (error) {
    globalThis.reportError?.(error);
    return false;
  }
}

/** The day a host's first-day-of-week names, from 0 for Sunday, or null to follow its language. */
export function firstDayAttribute(host) {
  const index = WEEKDAYS.indexOf(host.getAttribute('first-day-of-week'));
  return index === -1 ? null : index;
}

/**
 * A property set on an element before it was defined is an own property, and
 * it hides the class's accessor from then on. Take it over, through the
 * accessor. Frameworks set properties whenever they render, defined or not.
 */
export function adoptProperty(element, name) {
  if (!Object.prototype.hasOwnProperty.call(element, name)) return;
  const value = element[name];
  delete element[name];
  element[name] = value;
}

export class CalendarGrid {
  /**
   * @param {object} options
   * @param {string} options.id - prefix for the ids the grid gives its parts
   * @param {(date: string, via: 'keyboard' | 'pointer') => void} options.onSelect - a day was chosen
   * @param {(month: string) => void} options.onMonth - another month is shown, as its first day
   */
  constructor({ id, onSelect, onMonth }) {
    this._id = id;
    this._onSelect = onSelect;
    this._onMonth = onMonth;
    this._config = {
      lang: undefined,
      min: '',
      max: '',
      firstDay: null,
      isDateDisabled: null,
      previousText: 'Previous month',
      nextText: 'Next month',
      disabled: false,
      readOnly: false,
    };
    this._selected = '';
    // The day that is the grid's tab stop, always in the month shown.
    this._active = '';
    this._view = '';
    this._monthsKey = null;
    this._yearsKey = null;
    this._weekdaysKey = null;
    this._statusTimer = null;
    this.element = this._build();
  }

  /** Update any of: lang, min, max, firstDay, isDateDisabled, previousText, nextText, disabled, readOnly. */
  configure(config) {
    Object.assign(this._config, config);
  }

  get selected() {
    return this._selected;
  }

  set selected(date) {
    this._selected = date || '';
  }

  /** The month shown, as its first day. */
  get view() {
    this._ensureView();
    return this._view;
  }

  /**
   * Show the month `date` falls in, with `date` as the day the keyboard
   * starts from. Without a date: the chosen one, or else today. Either way the
   * day is kept between min and max. Returns whether the month changed.
   */
  show(date) {
    const { min, max } = this._config;
    const target = clampDate(date || this._selected || today(), min, max);
    const changed = startOfMonth(target) !== this._view;
    this._active = target;
    this._view = startOfMonth(target);
    return changed;
  }

  /** Move focus to the day that is the grid's tab stop. */
  focus(options) {
    this._ensureView();
    this._cells.find((cell) => cell.dataset.date === this._active)?.focus(options);
  }

  /** Drop an announcement still pending or on show, as when the grid is hidden. */
  silence() {
    clearTimeout(this._statusTimer);
    this._status.textContent = '';
  }

  render() {
    this._ensureView();
    const config = this._config;
    const locale = calendarLocale(config.lang);
    const firstDay = config.firstDay ?? locale.firstDay;
    const now = today();
    const view = this._view;
    const { year, month } = dateParts(view);
    const { min, max } = config;

    this._label.textContent = locale.formatMonth(view);
    setOrRemove(this._table, 'aria-readonly', config.readOnly ? 'true' : null);
    setOrRemove(this._table, 'aria-disabled', config.disabled ? 'true' : null);

    // aria-disabled rather than disabled: a button that disables itself under
    // the pointer or the keyboard would drop focus to the page.
    const previousMonth = addMonths(view, -1);
    const nextMonth = addMonths(view, 1);
    setOrRemove(this._previous, 'aria-label', config.previousText);
    setOrRemove(this._next, 'aria-label', config.nextText);
    setOrRemove(this._previous, 'aria-disabled', !previousMonth || (min && endOfMonth(previousMonth) < min) ? 'true' : null);
    setOrRemove(this._next, 'aria-disabled', !nextMonth || (max && nextMonth > max) ? 'true' : null);
    for (const control of [this._previous, this._next, this._monthSelect, this._yearSelect]) {
      control.disabled = config.disabled;
    }

    this._renderMonths(locale, year, month);
    this._renderYears(locale, year, now);
    this._renderWeekdays(locale, firstDay);

    const offset = (weekday(view) - firstDay + 7) % 7;
    const days = daysInMonth(year, month);
    this._cells.forEach((cell, index) => {
      const day = index - offset + 1;
      const inMonth = day >= 1 && day <= days;
      // The days around the month fill the rows it leaves empty. They are a
      // shortcut for the pointer, drawn muted and kept from the keyboard and
      // screen readers, which reach them by moving into their own month.
      const date = inMonth ? isoDate(year, month, day) : addDays(view, day - 1);
      if (!date) {
        clearCell(cell);
        return;
      }

      const unavailable = (min && date < min) || (max && date > max) || isDateDisabledBy(config.isDateDisabled, date);
      const text = locale.formatNumber(Number(date.slice(8)));
      if (cell.textContent !== text) cell.textContent = text;
      cell.dataset.date = date;
      cell.toggleAttribute('data-outside', !inMonth);
      setOrRemove(cell, 'aria-hidden', inMonth ? null : 'true');
      setOrRemove(cell, 'aria-label', inMonth ? locale.formatLong(date) : null);
      if (config.disabled || !inMonth) cell.removeAttribute('tabindex');
      else cell.tabIndex = date === this._active ? 0 : -1;
      setOrRemove(cell, 'aria-selected', inMonth && date === this._selected ? 'true' : null);
      setOrRemove(cell, 'aria-current', inMonth && date === now ? 'date' : null);
      setOrRemove(cell, 'aria-disabled', unavailable ? 'true' : null);
    });

    // A row of the next month's days alone is not a row of this month.
    this._rows.forEach((row, index) => {
      setOrRemove(row, 'aria-hidden', index * 7 - offset + 1 > days ? 'true' : null);
    });
  }

  // --- Rendering --------------------------------------------------------------

  _build() {
    const root = part('div', 'calendar');

    this._previous = part('button', 'previous', { type: 'button' });
    this._previous.innerHTML = CHEVRON.previous;
    this._next = part('button', 'next', { type: 'button' });
    this._next.innerHTML = CHEVRON.next;
    this._monthSelect = part('select', 'month');
    this._yearSelect = part('select', 'year');
    const caption = part('div', 'caption');
    caption.append(this._monthSelect, this._yearSelect);
    const header = part('div', 'header');
    header.append(this._previous, caption, this._next);

    // The grid is named by the month it shows. The selects show it too, but
    // a name read from a select's chosen option is not one every browser
    // computes.
    this._label = part('span', 'label', { id: `${this._id}-label`, hidden: '' });

    this._table = part('table', 'grid', { role: 'grid', 'aria-labelledby': this._label.id });
    // Every day's name starts with its weekday, so the column headers would
    // only be read twice.
    const head = this._table.createTHead();
    head.setAttribute('aria-hidden', 'true');
    const headRow = head.insertRow();
    this._weekdayCells = Array.from({ length: 7 }, () => {
      const cell = document.createElement('th');
      cell.scope = 'col';
      headRow.append(cell);
      return cell;
    });
    const body = this._table.createTBody();
    this._rows = [];
    this._cells = [];
    for (let week = 0; week < WEEKS; week += 1) {
      const row = body.insertRow();
      this._rows.push(row);
      for (let day = 0; day < 7; day += 1) this._cells.push(row.insertCell());
    }

    this._status = part('div', 'status', { role: 'status' });
    root.append(header, this._label, this._table, this._status);

    // The selects' input and change events are the grid's own business. The
    // component around it says what changed with aihio-change and aihio-month.
    for (const type of ['input', 'change']) root.addEventListener(type, (event) => event.stopPropagation());

    this._previous.addEventListener('click', () => this._step(-1));
    this._next.addEventListener('click', () => this._step(1));
    this._monthSelect.addEventListener('change', () => this._jump());
    this._yearSelect.addEventListener('change', () => this._jump());
    this._table.addEventListener('keydown', (event) => this._handleKey(event));
    this._table.addEventListener('click', (event) => this._handleClick(event));
    this._table.addEventListener('focusin', (event) => this._handleFocusIn(event));

    return root;
  }

  _renderMonths(locale, year, month) {
    if (this._monthsKey !== locale.tag) {
      this._monthsKey = locale.tag;
      this._monthSelect.replaceChildren(...locale.monthNames.map((name, index) => new Option(name, String(index + 1))));
      this._monthSelect.setAttribute('aria-label', locale.fieldNames.month);
    }
    const { min, max } = this._config;
    for (const option of this._monthSelect.options) {
      const first = isoDate(year, Number(option.value), 1);
      option.disabled = Boolean((min && endOfMonth(first) < min) || (max && first > max));
    }
    this._monthSelect.value = String(month);
  }

  _renderYears(locale, year, now) {
    const { min, max } = this._config;
    const thisYear = dateParts(now).year;
    const from = Math.min(min ? dateParts(min).year : Math.max(1, thisYear - YEARS_BACK), year);
    const to = Math.max(max ? dateParts(max).year : Math.min(9999, thisYear + YEARS_ON), year);
    const key = `${locale.tag} ${from} ${to}`;
    if (this._yearsKey !== key) {
      this._yearsKey = key;
      const options = [];
      for (let value = from; value <= to; value += 1) options.push(new Option(locale.formatNumber(value), String(value)));
      this._yearSelect.replaceChildren(...options);
      this._yearSelect.setAttribute('aria-label', locale.fieldNames.year);
    }
    this._yearSelect.value = String(year);
  }

  _renderWeekdays(locale, firstDay) {
    const key = `${locale.tag} ${firstDay}`;
    if (this._weekdaysKey === key) return;
    this._weekdaysKey = key;
    this._weekdayCells.forEach((cell, column) => {
      cell.textContent = locale.weekdays[(firstDay + column) % 7];
    });
  }

  _ensureView() {
    if (!this._view) this.show();
  }

  // --- Input ------------------------------------------------------------------

  _handleKey(event) {
    const cell = this._dayCell(event.target);
    if (!cell || event.altKey || event.ctrlKey || event.metaKey) return;

    const date = cell.dataset.date;
    let next;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        const later = (event.key === 'ArrowRight') !== this._isRtl();
        next = addDays(date, later ? 1 : -1);
        break;
      }
      case 'ArrowUp':
        next = addDays(date, -7);
        break;
      case 'ArrowDown':
        next = addDays(date, 7);
        break;
      case 'Home':
        next = addDays(date, -this._column(date));
        break;
      case 'End':
        next = addDays(date, 6 - this._column(date));
        break;
      case 'PageUp':
        next = addMonths(date, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        next = addMonths(date, event.shiftKey ? 12 : 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this._canChoose(cell)) this._onSelect(date, 'keyboard');
        return;
      default:
        return;
    }

    event.preventDefault();
    // Past the first or last day there is (years 1 and 9999), nothing moves.
    if (next) this._moveTo(next);
  }

  _handleClick(event) {
    const cell = this._dayCell(event.target);
    if (!cell || !this._canChoose(cell)) return;
    const date = cell.dataset.date;
    // A day of another month takes the grid there first, so the day chosen
    // is a day shown.
    if (cell.hasAttribute('data-outside')) this._moveTo(date);
    this._onSelect(date, 'pointer');
  }

  // A day focused by the pointer becomes the tab stop.
  _handleFocusIn(event) {
    const cell = this._dayCell(event.target);
    if (!cell || cell.dataset.date === this._active) return;
    this._active = cell.dataset.date;
    for (const other of this._cells) {
      if (other.hasAttribute('tabindex')) other.tabIndex = other === cell ? 0 : -1;
    }
  }

  _canChoose(cell) {
    return !this._config.disabled && !this._config.readOnly && cell.getAttribute('aria-disabled') !== 'true';
  }

  _dayCell(target) {
    const cell = target?.closest?.('td[data-date]');
    return cell && this._table.contains(cell) ? cell : null;
  }

  /** Move the tab stop and focus to `date`, kept between min and max, showing its month. */
  _moveTo(date) {
    const changed = this.show(date);
    this.render();
    this.focus();
    if (changed) this._onMonth?.(this._view);
  }

  /** The previous and next month buttons. */
  _step(months) {
    const button = months < 0 ? this._previous : this._next;
    if (this._config.disabled || button.getAttribute('aria-disabled') === 'true') return;
    const target = addMonths(this._active, months);
    if (!target) return;
    const changed = this.show(target);
    this.render();
    this._announce(calendarLocale(this._config.lang).formatMonth(this._view));
    if (changed) this._onMonth?.(this._view);
  }

  /** The month and year selects. */
  _jump() {
    const year = Number(this._yearSelect.value);
    const month = Number(this._monthSelect.value);
    const target = isoDate(year, month, Math.min(dateParts(this._active).day, daysInMonth(year, month)));
    if (!target) return;
    const changed = this.show(target);
    this.render();
    if (changed) this._onMonth?.(this._view);
  }

  _column(date) {
    const firstDay = this._config.firstDay ?? calendarLocale(this._config.lang).firstDay;
    return (weekday(date) - firstDay + 7) % 7;
  }

  _isRtl() {
    return getComputedStyle(this._table).direction === 'rtl';
  }

  _announce(text) {
    clearTimeout(this._statusTimer);
    this._status.textContent = '';
    this._statusTimer = setTimeout(() => {
      this._status.textContent = text;
    }, STATUS_DELAY);
  }
}

function part(tag, name, attributes = {}) {
  const element = document.createElement(tag);
  element.setAttribute('data-calendar-part', name);
  for (const [attribute, value] of Object.entries(attributes)) element.setAttribute(attribute, value);
  return element;
}

// Before year 1 and after year 9999 a cell has no day to show.
function clearCell(cell) {
  if (cell.textContent !== '') cell.textContent = '';
  delete cell.dataset.date;
  for (const name of ['data-outside', 'tabindex', 'aria-label', 'aria-selected', 'aria-current', 'aria-disabled']) {
    cell.removeAttribute(name);
  }
  cell.setAttribute('aria-hidden', 'true');
}

function setOrRemove(element, name, value) {
  if (value === null || value === undefined || value === false) {
    element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
}
