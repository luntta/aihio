import { AihioElement } from '../base.js';
import {
  SortableHeaders,
  columnName,
  markSorted,
  nextDirection,
  sortAnnouncement,
} from '../sort-headers.js';

// Rows rendered beyond those in view, above and below, so a wheel step or an
// arrow key lands on rows that are already there.
const OVERSCAN = 10;

// The rows are asked for again once those in view come within this many rows
// of either end of the rows rendered.
const MARGIN = 3;

// A row's height until one has rendered and can be measured.
const ESTIMATED_ROW_HEIGHT = 41;

// The sort is announced in a task of its own, so a repeat of the same
// message is still a change a screen reader hears.
const STATUS_DELAY = 150;

const HEADER_ATTRIBUTES = ['aria-sort', 'data-sortable'];

// What the keyboard reaches on its own inside a cell.
const FOCUSABLE = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, iframe, summary, [contenteditable=""], [contenteditable="true"], [tabindex]';

// Keys pressed in these belong to them: a text field moves its caret with
// the arrows, and an open menu moves through its items.
const OWN_KEYS = 'input, select, textarea, [contenteditable=""], [contenteditable="true"], [role="menu"], [role="menuitem"], [role="listbox"], [role="option"], [role="slider"], [role="spinbutton"]';

export class AihioDataGrid extends AihioElement {
  static tag = 'aihio-data-grid';
  static schemaVersion = '1.0.0';
  static observedAttributes = [
    'row-count',
    'density',
    'loading',
    'sort-ascending-text',
    'sort-descending-text',
  ];

  setup() {
    this._table = null;
    this._body = null;
    this._observedBody = null;
    this._headers = new SortableHeaders();
    // The rows asked for, and the first of the rows rendered now: your code
    // may still be rendering the rows asked for.
    this._start = 0;
    this._end = 0;
    this._shown = 0;
    this._requested = false;
    this._structureChanged = false;
    this._inSync = false;
    this._rowHeight = 0;
    this._active = { row: -1, col: 0 };
    this._pending = null;
    this._interacting = null;
    this._lastFocused = null;
    this._hasFocus = false;
    this._tabStop = null;
    this._managed = new WeakSet();
    this._ownsBusy = false;
    this._ownsTabIndex = false;
    this._statusTimer = null;
    this._scrollFrame = 0;

    // A clone of an upgraded grid carries the status region the original
    // rendered. Drop it rather than rendering a second one beside it.
    for (const stale of this.querySelectorAll(':scope > [data-table-part]')) stale.remove();

    this._status = document.createElement('div');
    this._status.setAttribute('data-table-part', 'status');
    this._status.setAttribute('role', 'status');
    this._before = createSpacer('before');
    this._after = createSpacer('after');

    this._onClick = (event) => {
      const header = this._headers.headerFor(event.target);
      if (!header || event.defaultPrevented) return;

      const direction = nextDirection(header);
      this._withOwnMutations(() => markSorted(this._table, header, direction));
      this._announce(sortAnnouncement(this, header, direction));
      this.emit('aihio-sort', { column: columnName(header), direction });
      // The rows are your code's to sort, so it is asked for them again, from
      // the top of the new order.
      this.scrollTop = 0;
      this._updateRange({ force: true });
    };

    this._onKeyDown = (event) => this._handleKey(event);

    this._onFocusIn = (event) => {
      this._hasFocus = true;
      const cell = this._cellOf(event.target);
      if (!cell) return;
      this._lastFocused = event.target;
      if (this._interacting && this._interacting !== cell) this._leaveCell();
      const position = this._positionOf(cell);
      if (!position) return;
      this._active = position;
      this._syncTabStop();
    };

    // Focus has left the grid, unless the element losing it was removed
    // with its row, which some engines report as a focusout too.
    this._onFocusOut = (event) => {
      if (this._interacting && !this._interacting.contains(event.relatedTarget)) this._leaveCell();
      if (event.relatedTarget && this.contains(event.relatedTarget)) return;
      const { target } = event;
      queueMicrotask(() => {
        if (target.isConnected) this._hasFocus = false;
      });
    };

    this._onScroll = () => {
      if (this._scrollFrame) return;
      this._scrollFrame = requestAnimationFrame(() => {
        this._scrollFrame = 0;
        this._updateRange();
      });
    };

    this._observer = new MutationObserver((records) => {
      this._noteRecords(records);
      this.refresh();
    });
    this._resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => this._updateRange())
      : null;

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
    this.addEventListener('focusin', this._onFocusIn);
    this.addEventListener('focusout', this._onFocusOut);
    this.addEventListener('scroll', this._onScroll, { passive: true });
  }

  connect() {
    this._observeStructure();
  }

  disconnect() {
    this._observer.disconnect();
    this._resizeObserver?.disconnect();
    this._observedBody = null;
    clearTimeout(this._statusTimer);
    cancelAnimationFrame(this._scrollFrame);
    this._scrollFrame = 0;
  }

  syncAttribute(name) {
    // The rows change with the count (a filter applied, say), so they are
    // asked for again once the sync below has settled.
    if (name === 'row-count') this._requested = false;
  }

  sync() {
    this._inSync = true;
    this._withOwnMutations(() => {
      if (this._status.parentNode !== this) this.append(this._status);
      this._syncHostTabIndex();
      if (this._syncTable()) this._observeStructure();
      if (!this._table) return;

      this._syncBody();
      this._headers.sync(this._table);
      this._syncBusy();
      this._decorate();
    });
    this._inSync = false;

    // Asking for rows runs your code, which renders them: outside the
    // wrapper above, so the observer hears about them.
    if (this._table) this._updateRange({ force: !this._requested });
  }

  // --- Public API -----------------------------------------------------------

  /** The <table> this element enhances. */
  get table() {
    return this._table ?? null;
  }

  /** The <tbody> your code renders the rows into. */
  get body() {
    return this._body ?? null;
  }

  /** The first row asked for, counting from 0. */
  get start() {
    return this._start ?? 0;
  }

  /** The row after the last one asked for. */
  get end() {
    return this._end ?? 0;
  }

  get rowCount() {
    return wholeNumber(this.getAttribute('row-count')) ?? 0;
  }

  set rowCount(value) {
    this.setAttribute('row-count', String(value));
  }

  /** Scroll so the row at `index` (from 0) is at the top of the view. */
  scrollToRow(index) {
    if (!this._table) return;
    const row = clamp(Number(index) || 0, 0, Math.max(this.rowCount - 1, 0));
    this.scrollTop = this._dataTop() + row * this._rowHeightOrGuess() - this._headHeight();
    this._updateRange();
  }

  // --- Structure ------------------------------------------------------------

  _syncTable() {
    const table = [...this.children].find((child) => child.localName === 'table') ?? null;
    if (table === this._table) return false;

    if (this._table) {
      this._headers.releaseAll();
      this._before.remove();
      this._after.remove();
      if (this._ownsBusy) this._table.removeAttribute('aria-busy');
    }
    this._ownsBusy = false;
    this._table = table;
    this._body = null;
    this._requested = false;

    // A clone of an upgraded grid carries the spacers the original rendered.
    for (const stale of table?.querySelectorAll(':scope > tbody[data-grid-part]') ?? []) {
      if (stale !== this._before && stale !== this._after) stale.remove();
    }
    return true;
  }

  /**
   * Your code's rows go in the table's own <tbody>; the grid creates one when
   * there is none. Around it sit two empty sections of the grid's, as tall as
   * the rows above and below the ones rendered, which give the scroll box its
   * full height without rendering those rows.
   */
  _syncBody() {
    const table = this._table;
    let body = [...table.tBodies].find((section) => !section.hasAttribute('data-grid-part')) ?? null;
    if (!body) {
      body = document.createElement('tbody');
      table.append(body);
    }
    // A body your code replaced holds the rows asked for.
    if (body !== this._body) this._shown = this._start;
    this._body = body;
    if (body.previousElementSibling !== this._before) table.insertBefore(this._before, body);
    if (body.nextElementSibling !== this._after) body.after(this._after);

    if (body !== this._observedBody && this.isConnected) {
      this._observedBody = body;
      this._observer.observe(body, { childList: true, subtree: true });
    }
  }

  _observeStructure() {
    this._observer.disconnect();
    this._resizeObserver?.disconnect();
    this._observedBody = null;
    if (!this.isConnected) return;

    this._observer.observe(this, { childList: true });
    this._resizeObserver?.observe(this);
    if (!this._table) return;
    this._observer.observe(this._table, { childList: true });
    if (this._table.tHead) {
      this._observer.observe(this._table.tHead, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: HEADER_ATTRIBUTES,
      });
    }
  }

  /**
   * Rows added to or removed from the body after a request mean your code
   * has rendered the rows asked for; an edit inside a cell does not. A
   * section added to or removed from the table is observed again.
   */
  _noteRecords(records) {
    for (const record of records) {
      if (record.target === this._table) this._structureChanged = true;
      else if (record.target === this._body) this._shown = this._start;
    }
  }

  /**
   * Run `work`, which changes the table, without hearing about it again.
   * Records already queued are someone else's: they are read first, and
   * outside a sync they get one, since the observer will not deliver them.
   */
  _withOwnMutations(work) {
    const foreign = this._observer.takeRecords();
    this._noteRecords(foreign);
    if (this._structureChanged) {
      this._structureChanged = false;
      this._observeStructure();
    }
    work();
    this._observer.takeRecords();
    if (foreign.length > 0 && !this._inSync) queueMicrotask(() => this.refresh());
  }

  /**
   * The grid's tab stop is one of its cells. Firefox makes any scroll box a
   * tab stop too, which would put one before the grid's own, so the box is
   * taken out of the order (unless its author put it in).
   */
  _syncHostTabIndex() {
    if (this._ownsTabIndex || !this.hasAttribute('tabindex')) {
      setAttribute(this, 'tabindex', '-1');
      this._ownsTabIndex = true;
    }
  }

  _syncBusy() {
    const table = this._table;
    if (this.hasAttribute('loading')) {
      if (table.getAttribute('aria-busy') !== 'true') {
        table.setAttribute('aria-busy', 'true');
        this._ownsBusy = true;
      }
    } else if (this._ownsBusy) {
      table.removeAttribute('aria-busy');
      this._ownsBusy = false;
    }
  }

  /**
   * The table is a grid of every row there is: aria-rowcount says how many,
   * and each rendered row says which it is with aria-rowindex. Every cell and
   * every control in one is taken out of the tab order but one, and the
   * spacers are sized to the rows not rendered.
   */
  _decorate() {
    const table = this._table;
    const count = this.rowCount;
    const headRows = [...(table.tHead?.rows ?? [])];
    const rows = [...this._body.rows];

    // The spacers are sized before anything is measured. Your code has just
    // swapped the rows, so until they are, the content is shorter or taller
    // than it will be, and a layout in that state would clamp the scroll
    // position to it.
    this._sizeSpacers(rows.length);

    setAttribute(table, 'role', 'grid');
    setAttribute(table, 'aria-rowcount', String(headRows.length + count));

    headRows.forEach((row, index) => {
      setAttribute(row, 'aria-rowindex', String(index + 1));
      for (const cell of row.cells) this._inert(cell);
    });

    rows.forEach((row, index) => {
      const position = this._shown + index;
      if (position < count) setAttribute(row, 'aria-rowindex', String(headRows.length + position + 1));
      else row.removeAttribute('aria-rowindex');
      for (const cell of row.cells) this._inert(cell);
    });

    const columns = this._columnCount();
    for (const spacer of [this._before, this._after]) setAttribute(spacer.rows[0].cells[0], 'colspan', String(columns));

    const measured = rows[0]?.getBoundingClientRect().height;
    if (measured > 0 && Math.abs(measured - this._rowHeight) > 0.5) {
      this._rowHeight = measured;
      this._sizeSpacers(rows.length);
    }

    this._syncTabStop();
    this._resolvePending();
    this._recoverFocus();
  }

  /** As tall as the rows above and below those rendered. */
  _sizeSpacers(rendered) {
    const height = this._rowHeightOrGuess();
    setHeight(this._before, this._shown * height);
    setHeight(this._after, Math.max(0, this.rowCount - this._shown - rendered) * height);
  }

  /** Out of the tab order, but focusable from script: a cell and its controls. */
  _inert(cell) {
    if (cell === this._interacting) return;
    setAttribute(cell, 'tabindex', '-1');
    for (const widget of this._widgets(cell)) {
      this._managed.add(widget);
      setAttribute(widget, 'tabindex', '-1');
    }
  }

  /**
   * The controls in a cell the keyboard would otherwise reach, and those the
   * grid has taken out of the tab order. A control hidden in a closed menu is
   * not one, and neither is one its author took out of the order.
   */
  _widgets(cell) {
    return [...cell.querySelectorAll(FOCUSABLE)].filter((element) =>
      (this._managed.has(element) || element.getAttribute('tabindex') !== '-1') &&
      !element.disabled &&
      isRendered(element)
    );
  }

  /** What focus lands on in a cell: its one control, or the cell itself. */
  _target(cell) {
    const widgets = this._widgets(cell);
    return widgets.length === 1 ? widgets[0] : cell;
  }

  _columnCount() {
    const head = this._table.tHead;
    const row = head?.rows[head.rows.length - 1] ?? this._body?.rows[0];
    return Math.max([...(row?.cells ?? [])].reduce((sum, cell) => sum + Math.max(cell.colSpan, 1), 0), 1);
  }

  // --- Range ----------------------------------------------------------------

  /**
   * Ask for the rows in view and a margin around them, unless the rows asked
   * for already cover them. Your code answers aihio-range by rendering them.
   */
  _updateRange({ force = false } = {}) {
    if (!this._table || !this.isConnected) return;
    const count = this.rowCount;
    const { first, last } = this._rowsInView();

    const covered = this._start <= Math.max(0, first - MARGIN) &&
      this._end >= Math.min(count, last + 1 + MARGIN) &&
      this._end <= count;
    if (covered && !force) return;

    const start = count === 0 ? 0 : Math.max(0, first - OVERSCAN);
    const end = count === 0 ? 0 : Math.min(count, last + 1 + OVERSCAN);
    if (!force && start === this._start && end === this._end) return;

    this._start = start;
    this._end = end;
    this._requested = true;
    this.emit('aihio-range', { start, end });
  }

  /** The first and last row whose box is in view below the header. */
  _rowsInView() {
    const count = this.rowCount;
    if (count === 0) return { first: 0, last: -1 };
    const height = this._rowHeightOrGuess();
    const top = this.scrollTop + this._headHeight() - this._dataTop();
    const bottom = this.scrollTop + this.clientHeight - this._dataTop();
    const first = clamp(Math.floor(top / height), 0, count - 1);
    const last = clamp(Math.ceil(bottom / height) - 1, first, count - 1);
    return { first, last };
  }

  /** Where the first row starts, from the top of what scrolls. */
  _dataTop() {
    return this._table.offsetTop + this._before.offsetTop;
  }

  _headHeight() {
    return this._table.tHead?.offsetHeight ?? 0;
  }

  _rowHeightOrGuess() {
    return this._rowHeight || ESTIMATED_ROW_HEIGHT;
  }

  // --- Keyboard -------------------------------------------------------------

  /**
   * The WAI-ARIA data grid keys. Moving to a row that is not rendered scrolls
   * it into view and focuses it once your code has rendered it.
   */
  _handleKey(event) {
    if (event.defaultPrevented || event.altKey) return;
    const cell = this._cellOf(event.target);
    if (!cell) return;

    if (this._interacting) {
      if (event.key === 'Escape' && this._interacting === cell) {
        event.preventDefault();
        this._leaveCell({ focus: true });
      }
      return;
    }
    if (event.target !== cell && event.target.closest?.(OWN_KEYS)) return;

    const position = this._positionOf(cell);
    if (!position) return;
    const { row, col } = position;
    const lastRow = this.rowCount - 1;
    const lastColumn = this._columnCount() - 1;
    const control = event.ctrlKey || event.metaKey;
    const below = row === -1 ? this._rowsInView().first : row + 1;
    const page = Math.max(1, Math.floor((this.clientHeight - this._headHeight()) / this._rowHeightOrGuess()));

    let next;
    switch (event.key) {
      case 'ArrowRight': next = [row, col + 1]; break;
      case 'ArrowLeft': next = [row, col - 1]; break;
      case 'ArrowDown': next = [below, col]; break;
      case 'ArrowUp': next = [row - 1, col]; break;
      case 'PageDown': next = [Math.min(lastRow, (row === -1 ? below : row) + page), col]; break;
      case 'PageUp': next = [row === -1 ? -1 : Math.max(0, row - page), col]; break;
      case 'Home': next = control ? [-1, 0] : [row, 0]; break;
      case 'End': next = control ? [lastRow, lastColumn] : [row, lastColumn]; break;
      case ' ':
        // Space on a cell would scroll the box, out from under the cell.
        if (event.target === cell) event.preventDefault();
        return;
      case 'Enter':
      case 'F2':
        // A cell holding several controls is entered, and left with Escape.
        if (event.target === cell && this._widgets(cell).length > 1) {
          event.preventDefault();
          this._enterCell(cell);
        }
        return;
      default:
        return;
    }

    event.preventDefault();
    if (control && event.key === 'Home') this.scrollTop = 0;
    this._moveTo(next[0], next[1]);
  }

  _moveTo(row, col) {
    const target = {
      row: clamp(row, -1, Math.max(this.rowCount - 1, -1)),
      col: clamp(col, 0, this._columnCount() - 1),
    };
    this._active = target;
    const cell = this._cellAt(target.row, target.col);
    if (!cell) {
      this._pending = target;
      this._scrollRowIntoView(target.row);
      return;
    }
    this._pending = null;
    this._syncTabStop();
    this._reveal(cell);
    this._target(cell).focus({ preventScroll: true });
  }

  _resolvePending() {
    if (!this._pending || !this._cellAt(this._pending.row, this._pending.col)) return;
    const { row, col } = this._pending;
    this._pending = null;
    // Focus moves once the decoration that called this has finished.
    queueMicrotask(() => this._moveTo(row, col));
  }

  /**
   * One cell's control is the tab stop: the active cell's, or the header's
   * in its column while the active row is not rendered.
   */
  _syncTabStop() {
    const cell = this._cellAt(this._active.row, this._active.col) ??
      this._cellAt(-1, this._active.col) ??
      this._cellAt(-1, 0);
    const target = cell ? this._target(cell) : null;
    if (this._tabStop && this._tabStop !== target && this._tabStop.isConnected && !this._interacting?.contains(this._tabStop)) {
      setAttribute(this._tabStop, 'tabindex', '-1');
    }
    if (target) setAttribute(target, 'tabindex', '0');
    this._tabStop = target;
  }

  /**
   * The row holding focus scrolled away and your code removed it. Focus goes
   * to the header of the same column, which is always rendered, rather than
   * to the page.
   */
  _recoverFocus() {
    // A cell the keyboard is moving to takes focus once it renders.
    if (this._pending) return;
    const lost = this._hasFocus && this._lastFocused && !this._lastFocused.isConnected;
    if (!lost || !isFocusLost()) return;
    this._lastFocused = null;
    const header = this._cellAt(-1, this._active.col);
    if (!header) return;
    queueMicrotask(() => {
      if (isFocusLost()) this._target(header).focus({ preventScroll: true });
    });
  }

  _enterCell(cell) {
    this._interacting = cell;
    const widgets = this._widgets(cell);
    for (const widget of widgets) setAttribute(widget, 'tabindex', '0');
    widgets[0]?.focus();
  }

  _leaveCell({ focus = false } = {}) {
    const cell = this._interacting;
    this._interacting = null;
    if (!cell) return;
    this._inert(cell);
    this._syncTabStop();
    if (focus) cell.focus();
  }

  /** Scroll a row in from whichever edge it is beyond. */
  _scrollRowIntoView(row) {
    if (row < 0) {
      this.scrollTop = 0;
    } else {
      const height = this._rowHeightOrGuess();
      const top = this._dataTop() + row * height;
      if (top < this.scrollTop + this._headHeight()) this.scrollTop = top - this._headHeight();
      else this.scrollTop = top + height - this.clientHeight;
    }
    this._updateRange();
  }

  /** Bring a rendered cell fully into view, below the sticky header. */
  _reveal(cell) {
    const box = this.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    const top = box.top + this.clientTop + (cell.parentElement.parentElement === this._table.tHead ? 0 : this._headHeight());
    const bottom = box.top + this.clientTop + this.clientHeight;
    if (rect.top < top) this.scrollTop -= top - rect.top;
    else if (rect.bottom > bottom) this.scrollTop += rect.bottom - bottom;

    const left = box.left + this.clientLeft;
    const right = left + this.clientWidth;
    if (rect.left < left) this.scrollLeft -= left - rect.left;
    else if (rect.right > right) this.scrollLeft += rect.right - right;
  }

  _cellOf(element) {
    const cell = element?.closest?.('td, th');
    return cell?.closest('table') === this._table ? cell : null;
  }

  /** A cell's place in the grid: row -1 is the header, and rows count from 0. */
  _positionOf(cell) {
    const section = cell.parentElement?.parentElement;
    if (section === this._table.tHead) return { row: -1, col: cell.cellIndex };
    if (section !== this._body) return null;
    const row = this._shown + cell.parentElement.sectionRowIndex;
    return row < this.rowCount ? { row, col: cell.cellIndex } : null;
  }

  _cellAt(row, col) {
    if (!this._table) return null;
    if (row === -1) {
      const head = this._table.tHead;
      return head?.rows[head.rows.length - 1]?.cells[col] ?? null;
    }
    if (row < this._shown || row >= this.rowCount) return null;
    return this._body?.rows[row - this._shown]?.cells[col] ?? null;
  }

  _announce(text) {
    clearTimeout(this._statusTimer);
    this._status.textContent = '';
    this._statusTimer = setTimeout(() => {
      this._status.textContent = text;
    }, STATUS_DELAY);
  }
}

function createSpacer(part) {
  const body = document.createElement('tbody');
  body.setAttribute('data-grid-part', part);
  body.setAttribute('aria-hidden', 'true');
  body.insertRow().insertCell();
  return body;
}

function setHeight(spacer, pixels) {
  const value = `${Math.round(pixels)}px`;
  const row = spacer.rows[0];
  if (row.style.height !== value) row.style.height = value;
}

function setAttribute(element, name, value) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function isFocusLost() {
  const active = document.activeElement;
  return !active || active === document.body;
}

function isRendered(element) {
  return typeof element.checkVisibility === 'function'
    ? element.checkVisibility()
    : element.getClientRects().length > 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function wholeNumber(value) {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}
