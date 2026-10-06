import { AihioElement } from '../base.js';
import {
  SORTED,
  SortableHeaders,
  columnName,
  headerCells,
  markSorted,
  nextDirection,
  sortAnnouncement,
} from '../sort-headers.js';

let tableInstanceId = 0;

// The attributes in the header that change what the table does: which
// columns sort, which one the rows are sorted by, and where each column sits.
const HEADER_ATTRIBUTES = ['aria-sort', 'data-sortable', 'colspan', 'rowspan'];

// The sort is announced after the rows have moved, in a task of its own, so
// a repeat of the same message is still a change a screen reader hears.
const STATUS_DELAY = 150;

// A plain decimal, as written in data-sort-value, or as left once a formatted
// figure has lost its grouping, currency, and percent signs.
const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;
const NUMBER_DECORATION = /[\s\p{Sc}%‰]/gu;
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

const collators = new Map();
const numberParsers = new Map();

export class AihioTable extends AihioElement {
  static tag = 'aihio-table';
  static schemaVersion = '1.0.0';
  static observedAttributes = [
    'density',
    'sticky-header',
    'manual-sort',
    'loading',
    'sort-ascending-text',
    'sort-descending-text',
  ];

  setup() {
    this._baseId = `aihio-table-${++tableInstanceId}`;
    this._table = null;
    this._headers = new SortableHeaders();
    this._applied = null;
    this._rowsVersion = 0;
    this._sortHint = null;
    this._structureChanged = false;
    this._inSync = false;
    this._overflowing = false;
    this._ownedAttributes = new Set();
    this._ownsBusy = false;
    this._stackedOffsets = false;
    this._statusTimer = null;
    this._scrollFrame = 0;
    this._waitingForParse = false;

    // A clone of an upgraded table carries the status region the original
    // rendered. Drop it rather than rendering a second one beside it.
    for (const stale of this.querySelectorAll(':scope > [data-table-part]')) stale.remove();

    this._status = document.createElement('div');
    this._status.setAttribute('data-table-part', 'status');
    this._status.setAttribute('role', 'status');

    this._onClick = (event) => {
      // A handler of the author's that prevents the click's default stops
      // the sort.
      const header = this._headers.headerFor(event.target);
      if (!header || event.defaultPrevented) return;

      const direction = nextDirection(header);
      this._sortBy(header, direction);
      this._announce(sortAnnouncement(this, header, direction));
      this.emit('aihio-sort', { column: columnName(header), direction });
    };

    this._onScroll = () => {
      if (this._scrollFrame) return;
      this._scrollFrame = requestAnimationFrame(() => {
        this._scrollFrame = 0;
        this._syncScrollEdges();
      });
    };

    // Only the structure is observed: the host and the table for their
    // children, the header for its cells and sort state, and each body for
    // its rows. Edits inside a cell are not, so a live table that updates its
    // figures costs nothing here.
    this._observer = new MutationObserver((records) => {
      this._noteRecords(records);
      this.refresh();
    });
    this._resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => this._measure())
      : null;

    this.addEventListener('click', this._onClick);
    this.addEventListener('scroll', this._onScroll, { passive: true });
  }

  connect() {
    this._observeStructure();
  }

  disconnect() {
    this._observer.disconnect();
    this._resizeObserver?.disconnect();
    clearTimeout(this._statusTimer);
    cancelAnimationFrame(this._scrollFrame);
    this._scrollFrame = 0;
  }

  syncAttribute(name) {
    if (name === 'sticky-header') this._syncStickyOffsets();
  }

  sync() {
    this._inSync = true;
    this._withOwnMutations(() => {
      if (this._status.parentNode !== this) this.append(this._status);
      if (this._syncTable()) this._observeStructure();
      if (!this._table) return;

      this._headers.sync(this._table);
      this._syncBusy();
      this._applySort();
      this._syncRegion();
    });
    this._inSync = false;
  }

  // --- Public API -----------------------------------------------------------

  /** The <table> this element enhances. */
  get table() {
    return this._table ?? null;
  }

  /**
   * Sort by the column whose data-sortable value, or header text, is
   * `column`. Like a value set from script, it fires no aihio-sort and
   * announces nothing.
   */
  sort(column, direction = 'ascending') {
    if (!this._table) return;
    this._withOwnMutations(() => this._headers.sync(this._table));

    const header = this._headers.find(column);
    if (header) this._sortBy(header, direction === 'descending' ? 'descending' : 'ascending');
  }

  // --- Structure ------------------------------------------------------------

  _syncTable() {
    const table = [...this.children].find((child) => child.localName === 'table') ?? null;
    if (table === this._table) return false;

    this._headers.releaseAll();
    if (this._ownsBusy) this._table?.removeAttribute('aria-busy');
    this._ownsBusy = false;

    this._table = table;
    this._applied = null;
    this._rowsVersion += 1;
    return true;
  }

  _observeStructure() {
    this._observer.disconnect();
    this._resizeObserver?.disconnect();
    if (!this.isConnected) return;

    this._observer.observe(this, { childList: true });
    this._resizeObserver?.observe(this);

    const table = this._table;
    if (!table) return;
    this._observer.observe(table, { childList: true });
    this._resizeObserver?.observe(table);
    if (table.tHead) {
      this._observer.observe(table.tHead, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: HEADER_ATTRIBUTES,
      });
    }
    for (const body of table.tBodies) this._observer.observe(body, { childList: true });
  }

  /**
   * Fold what changed into the state the next sync reads. A row added to or
   * removed from a body changes the rows a sort has to place, and a header
   * newly marked sorted is the one to sort by, even before a stale mark on
   * another header has been cleared.
   */
  _noteRecords(records) {
    for (const record of records) {
      const { target } = record;
      if (record.type === 'attributes') {
        if (record.attributeName === 'aria-sort' && SORTED.has(target.getAttribute('aria-sort'))) {
          this._sortHint = target;
        }
      } else if (target === this._table) {
        this._structureChanged = true;
        this._rowsVersion += 1;
      } else if (target.localName === 'tbody') {
        this._rowsVersion += 1;
      }
    }
  }

  /**
   * Run `work`, which mutates the table, without hearing about it again.
   * Records already queued are someone else's (a framework's commit, say):
   * they are read first, a section they added is observed before anything
   * moves, and outside a sync they get one, since the observer will not
   * deliver them. What is queued afterwards is this element's own.
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

  // --- Sorting --------------------------------------------------------------

  /**
   * aria-sort says what order the rows are in, so without manual-sort the
   * rows are kept in that order: when the page loads with a header already
   * marked, when script or a framework marks one, and when rows are added or
   * replaced under a sorted header. Edits inside a row do not move it.
   */
  _applySort() {
    if (this.hasAttribute('manual-sort')) {
      this._applied = null;
      return;
    }

    const header = this._sortedHeader();
    if (!header || !this._headers.has(header)) {
      this._applied = null;
      return;
    }

    const direction = header.getAttribute('aria-sort');
    const applied = this._applied;
    if (applied?.header === header && applied.direction === direction && applied.rows === this._rowsVersion) return;

    // Rows are still arriving from the parser; sort them once, when they
    // are all there.
    if (document.readyState === 'loading') {
      if (!this._waitingForParse) {
        this._waitingForParse = true;
        document.addEventListener('DOMContentLoaded', () => {
          this._waitingForParse = false;
          this.refresh();
        }, { once: true });
      }
      return;
    }

    this._sortRows(header, direction);
    this._applied = { header, direction, rows: this._rowsVersion };
  }

  /** The header the rows are sorted by. Only one column is sorted at a time. */
  _sortedHeader() {
    const sorted = headerCells(this._table).filter((cell) => SORTED.has(cell.getAttribute('aria-sort')));
    const hint = this._sortHint;
    this._sortHint = null;
    if (sorted.length === 0) return null;

    const header = sorted.includes(hint) ? hint : sorted[0];
    for (const cell of sorted) {
      if (cell !== header) cell.removeAttribute('aria-sort');
    }
    return header;
  }

  _sortBy(header, direction) {
    this._withOwnMutations(() => {
      markSorted(this._table, header, direction);
      if (this.hasAttribute('manual-sort')) return;
      this._sortRows(header, direction);
      this._applied = { header, direction, rows: this._rowsVersion };
    });
  }

  /**
   * Each body is sorted on its own, so <tbody> groups stay grouped. Keys are
   * read once per row; a column compares as numbers when every value in it
   * reads as one, and otherwise as text in the page's language, with digits
   * compared as numbers ("Item 2" before "Item 10"). Rows with no value go
   * last in either direction, and rows that tie keep the order they had,
   * which makes sorting by one column and then another a two-level sort.
   */
  _sortRows(header, direction) {
    const column = this._columnOf(header);
    if (column < 0) return;

    // A cell spanning rows ties those rows together, so they cannot be put
    // in an order of their own.
    const bodies = [...this._table.tBodies].filter((body) => !hasRowSpans(body));
    const locale = this._locale();
    const parseNumber = numberParser(locale);

    const groups = bodies.map((body) =>
      [...body.rows].map((row, index) => ({ row, index, ...sortKey(cellAt(row, column)) }))
    );

    let numeric = true;
    for (const entry of groups.flat()) {
      if (entry.empty) continue;
      entry.number = entry.explicit ? plainNumber(entry.text) : parseNumber(entry.text);
      if (Number.isNaN(entry.number)) numeric = false;
    }

    const collator = collatorFor(locale);
    const order = direction === 'descending' ? -1 : 1;
    const compare = (left, right) => {
      if (left.empty || right.empty) return Number(left.empty) - Number(right.empty) || left.index - right.index;
      const result = numeric ? left.number - right.number : collator.compare(left.text, right.text);
      return result * order || left.index - right.index;
    };

    const restoreFocus = keepFocus(bodies);
    bodies.forEach((body, index) => reorder(body, groups[index].sort(compare).map((entry) => entry.row)));
    restoreFocus();
  }

  /** The column a header names, counting the spans of the cells before it. */
  _columnOf(header) {
    const rows = [...(this._table.tHead?.rows ?? [])];
    const taken = rows.map(() => new Set());

    for (const [rowIndex, row] of rows.entries()) {
      let column = 0;
      for (const cell of row.cells) {
        while (taken[rowIndex].has(column)) column += 1;
        if (cell === header) return column;

        const colSpan = Math.max(cell.colSpan, 1);
        const rowSpan = cell.rowSpan === 0 ? rows.length - rowIndex : Math.max(cell.rowSpan, 1);
        for (let below = rowIndex + 1; below < Math.min(rowIndex + rowSpan, rows.length); below += 1) {
          for (let offset = 0; offset < colSpan; offset += 1) taken[below].add(column + offset);
        }
        column += colSpan;
      }
    }
    return -1;
  }

  _locale() {
    return this._table.closest('[lang]')?.getAttribute('lang')?.trim() || undefined;
  }

  _announce(text) {
    clearTimeout(this._statusTimer);
    this._status.textContent = '';
    this._statusTimer = setTimeout(() => {
      this._status.textContent = text;
    }, STATUS_DELAY);
  }

  // --- Scroll box -----------------------------------------------------------

  /**
   * Wider than its box (or, with sticky-header, taller), the table scrolls
   * inside it. The keyboard can only scroll what it can focus, so the box
   * then becomes a tab stop, and a region named by the caption so a screen
   * reader says what it is.
   */
  _measure() {
    if (!this._table) return;
    const overflowing = this.scrollWidth > this.clientWidth + 1 || this.scrollHeight > this.clientHeight + 1;
    if (overflowing !== this._overflowing) {
      this._overflowing = overflowing;
      this._syncRegion();
    }
    this._syncScrollEdges();
    this._syncStickyOffsets();
  }

  _syncRegion() {
    const label = this._overflowing ? this._regionLabel() : null;
    this._setOwnedAttribute('tabindex', this._overflowing ? '0' : null);
    this._setOwnedAttribute('role', label ? 'region' : null);
    this._setOwnedAttribute('aria-labelledby', label?.labelledby ?? null);
    this._setOwnedAttribute('aria-label', label?.label ?? null);
  }

  _regionLabel() {
    const table = this._table;
    const caption = table.caption;
    if (caption && normalizeSpace(caption.textContent)) {
      if (!caption.id) caption.id = `${this._baseId}-caption`;
      return { labelledby: caption.id };
    }
    const labelledby = table.getAttribute('aria-labelledby')?.trim();
    if (labelledby) return { labelledby };
    const label = table.getAttribute('aria-label')?.trim();
    return label ? { label } : null;
  }

  /** Set an attribute on the host, unless the author already set it. */
  _setOwnedAttribute(name, value) {
    const owned = this._ownedAttributes.has(name);
    if (value === null) {
      if (owned) this.removeAttribute(name);
      this._ownedAttributes.delete(name);
      return;
    }
    if (!owned && this.hasAttribute(name)) return;
    if (this.getAttribute(name) !== value) this.setAttribute(name, value);
    this._ownedAttributes.add(name);
  }

  /** Mark the edges with content scrolled past them, for the shadows. */
  _syncScrollEdges() {
    const hidden = this.scrollWidth - this.clientWidth;
    // scrollLeft runs negative from the start edge in a right-to-left table.
    const scrolled = Math.abs(this.scrollLeft);
    this.toggleAttribute('data-overflow-start', hidden > 1 && scrolled > 1);
    this.toggleAttribute('data-overflow-end', hidden > 1 && scrolled < hidden - 1);
  }

  /**
   * A header of several rows sticks as a block: each row below the first
   * sticks under the rows above it, so they do not stack on one line.
   */
  _syncStickyOffsets() {
    const rows = [...(this._table?.tHead?.rows ?? [])];
    const stacked = this.hasAttribute('sticky-header') && rows.length > 1;
    if (!stacked && !this._stackedOffsets) return;

    let offset = 0;
    for (const row of rows) {
      for (const cell of row.cells) {
        if (stacked) cell.style.setProperty('--aihio-table-sticky-top', `${offset}px`);
        else cell.style.removeProperty('--aihio-table-sticky-top');
      }
      offset += row.getBoundingClientRect().height;
    }
    this._stackedOffsets = stacked;
  }
}

/** The cell of `row` in `column`, counting each cell's colspan. */
function cellAt(row, column) {
  let position = 0;
  for (const cell of row.cells) {
    position += Math.max(cell.colSpan, 1);
    if (column < position) return cell;
  }
  return null;
}

function hasRowSpans(body) {
  return [...body.querySelectorAll(':scope > tr > [rowspan]')].some((cell) => cell.rowSpan !== 1);
}

/**
 * What a cell sorts by: data-sort-value, then a <time datetime> in it, then
 * its text. The first two are machine-readable, so they are never read as
 * formatted figures. Text with no letter or digit in it, such as a dash for
 * "none", is no value at all.
 */
function sortKey(cell) {
  if (!cell) return { text: '', explicit: false, empty: true };

  // Most cells hold only text, so most never need the selector.
  const time = cell.firstElementChild ? cell.querySelector('time[datetime]') : null;
  const value = cell.getAttribute('data-sort-value') ?? time?.getAttribute('datetime');
  if (value !== null && value !== undefined) {
    const text = value.trim();
    return { text, explicit: true, empty: text === '' };
  }

  const text = normalizeSpace(cell.textContent);
  return { text, explicit: false, empty: !WORD_CHARACTER.test(text) };
}

function plainNumber(text) {
  return NUMBER.test(text) ? Number(text) : Number.NaN;
}

/**
 * Read a figure as the page's language writes it: "€1,250.50" in English,
 * "1 250,50 €" in Finnish. Grouping, currency, percent signs, and spaces are
 * dropped, the decimal sign becomes a point, and what is left has to be a
 * plain number.
 */
function numberParser(locale) {
  const key = locale ?? '';
  let parse = numberParsers.get(key);
  if (parse) return parse;

  let group = ',';
  let decimal = '.';
  try {
    for (const part of new Intl.NumberFormat(locale).formatToParts(12345.6)) {
      if (part.type === 'group') group = part.value;
      else if (part.type === 'decimal') decimal = part.value;
    }
  } catch {
    // An unknown language tag: read figures the English way.
  }

  parse = (text) => {
    let value = text.replace(NUMBER_DECORATION, '').replace(/^−/, '-');
    if (group.trim()) value = value.split(group).join('');
    if (decimal !== '.') value = value.replace(decimal, '.');
    return plainNumber(value);
  };
  numberParsers.set(key, parse);
  return parse;
}

function collatorFor(locale) {
  const key = locale ?? '';
  let collator = collators.get(key);
  if (!collator) {
    try {
      collator = new Intl.Collator(locale, { numeric: true });
    } catch {
      collator = new Intl.Collator(undefined, { numeric: true });
    }
    collators.set(key, collator);
  }
  return collator;
}

/**
 * Put the rows of `body` in the order given, moving only the rows that are
 * out of place. The cursor is the first row not yet in place, and a row only
 * ever moves to just before it, never past the last row. So the rows stay
 * between whatever nodes a framework marks its list with (Vue renders one
 * between two empty text nodes), and it finds them there.
 */
function reorder(body, rows) {
  let cursor = body.rows[0] ?? null;
  for (const row of rows) {
    if (row === cursor) cursor = nextRow(cursor);
    else move(body, row, cursor);
  }
}

function nextRow(row) {
  let next = row.nextElementSibling;
  while (next && next.localName !== 'tr') next = next.nextElementSibling;
  return next;
}

/**
 * moveBefore() moves a row without taking it out of the document, so focus,
 * text selection, and anything playing inside it carry on. Where it is
 * missing, insertBefore() does the move and the caller puts focus back.
 */
function move(parent, node, before) {
  if (typeof parent.moveBefore === 'function') {
    try {
      parent.moveBefore(node, before);
      return;
    } catch {
      // Not movable in place here; fall back to an ordinary move.
    }
  }
  parent.insertBefore(node, before);
}

function keepFocus(containers) {
  const active = document.activeElement;
  if (!active || !containers.some((container) => container.contains(active))) return () => {};
  return () => {
    if (document.activeElement !== active && active.isConnected) active.focus({ preventScroll: true });
  };
}

function normalizeSpace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
