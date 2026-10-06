import { AihioElement } from '../base.js';

// A button that changes the page announces it once the list has re-rendered.
const STATUS_DELAY = 100;

const DEFAULT_LABEL = 'Pagination';

const CHEVRON = {
  previous: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M10 4L6 8l4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export class AihioPagination extends AihioElement {
  static tag = 'aihio-pagination';
  static schemaVersion = '1.0.0';
  static observedAttributes = [
    'page',
    'pages',
    'href',
    'previous-text',
    'next-text',
    'page-text',
    'aria-label',
    'aria-labelledby',
  ];

  setup() {
    this._rendered = null;
    this._compact = false;
    this._ownsLabel = false;
    this._statusTimer = null;

    // A clone of an upgraded element carries the list the original rendered.
    for (const stale of this.querySelectorAll(':scope > [data-pagination-part]')) stale.remove();

    // list-style: none takes a list's semantics away in Safari; the role puts
    // them back, so "list, 9 items" is still announced.
    this._list = document.createElement('ul');
    this._list.setAttribute('data-pagination-part', 'list');
    this._list.setAttribute('role', 'list');
    this._status = document.createElement('div');
    this._status.setAttribute('data-pagination-part', 'status');
    this._status.setAttribute('role', 'status');
    this.append(this._list, this._status);

    this._onClick = (event) => {
      const control = event.target?.closest?.('[data-pagination-page]');
      if (!control || control.parentElement?.parentElement !== this._list) return;
      if (control.disabled || control.getAttribute('aria-disabled') === 'true') return;

      // A click that opens the page in a new tab or window is the browser's.
      const isLink = control.localName === 'a';
      if (isLink && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;

      const page = Number(control.dataset.paginationPage);
      if (!this.emit('aihio-page', { page }, { cancelable: true })) {
        event.preventDefault();
        return;
      }
      // A link opens its page by navigating; a button's default is to show it.
      if (!isLink) this._show(page);
    };

    // The parent is watched as well as the element: in a row, the element is
    // sized to its list, and only its parent says when there is room again.
    this._resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => this._fit())
      : null;

    this.addEventListener('click', this._onClick);
  }

  connect() {
    this._resizeObserver?.observe(this);
    if (this.parentElement) this._resizeObserver?.observe(this.parentElement);
  }

  disconnect() {
    this._resizeObserver?.disconnect();
    clearTimeout(this._statusTimer);
  }

  syncAttribute(name, _oldValue, newValue) {
    // An author's own label replaces the default the element set.
    if (name === 'aria-label' && newValue !== DEFAULT_LABEL) this._ownsLabel = false;
  }

  sync() {
    const pages = this.pages;
    const empty = pages < 2;
    this.toggleAttribute('data-empty', empty);
    if (empty) {
      this.removeAttribute('role');
    } else if (this.getAttribute('role') !== 'navigation') {
      this.setAttribute('role', 'navigation');
    }
    this._syncLabel(empty);
    this._render(empty ? 0 : pages);
    if (!empty) this._fit();
  }

  // --- Public API -----------------------------------------------------------

  /** The current page, from 1, within the pages there are. */
  get page() {
    const page = wholeNumber(this.getAttribute('page')) ?? 1;
    return Math.min(Math.max(page, 1), Math.max(this.pages, 1));
  }

  set page(value) {
    this.setAttribute('page', String(value));
  }

  /** How many pages there are. */
  get pages() {
    return wholeNumber(this.getAttribute('pages')) ?? 0;
  }

  set pages(value) {
    this.setAttribute('pages', String(value));
  }

  // --- Rendering ------------------------------------------------------------

  _syncLabel(empty) {
    const labelled = this.hasAttribute('aria-labelledby') || (this.hasAttribute('aria-label') && !this._ownsLabel);
    if (empty || labelled) {
      if (this._ownsLabel) this.removeAttribute('aria-label');
      this._ownsLabel = false;
      return;
    }
    if (this.getAttribute('aria-label') !== DEFAULT_LABEL) this.setAttribute('aria-label', DEFAULT_LABEL);
    this._ownsLabel = true;
  }

  _render(pages) {
    const page = this.page;
    const href = this.getAttribute('href');
    const siblings = this._compact ? 0 : 1;
    const texts = [this._text('previous-text', 'Previous'), this._text('next-text', 'Next'), this._text('page-text', 'Page {page}')];
    const key = [pages, page, href, siblings, ...texts].join('\u0000');
    if (key === this._rendered) return;
    this._rendered = key;

    // The list is rebuilt rather than patched: it is never more than nine
    // items. Focus inside it goes back to the control that had it, or to the
    // current page when that control is now disabled (Next on the last page).
    const focused = this._list.contains(document.activeElement) ? document.activeElement.dataset.paginationKey : null;

    const [previousText, nextText, pageText] = texts;
    const items = [];
    if (pages > 0) {
      items.push(this._control('previous', page - 1, { label: previousText, disabled: page <= 1 }));
      for (const number of pageWindow(page, pages, siblings)) {
        if (number === null) {
          const gap = document.createElement('span');
          gap.setAttribute('data-pagination-part', 'gap');
          gap.textContent = '…';
          items.push(gap);
        } else {
          items.push(this._control('page', number, { label: pageText.replaceAll('{page}', String(number)), current: number === page }));
        }
      }
      items.push(this._control('next', page + 1, { label: nextText, disabled: page >= pages }));
    }

    this._list.replaceChildren(...items.map((item) => {
      const entry = document.createElement('li');
      // The gaps say nothing a screen reader needs: the page names do.
      if (item.dataset.paginationPart === 'gap') entry.setAttribute('aria-hidden', 'true');
      entry.append(item);
      return entry;
    }));

    if (focused) {
      const control = this._list.querySelector(`[data-pagination-key="${focused}"]`);
      const target = control && !control.disabled && control.getAttribute('aria-disabled') !== 'true'
        ? control
        : this._list.querySelector('[aria-current="page"]');
      target?.focus({ preventScroll: true });
    }
  }

  /**
   * A link when there is an address to go to, so the page opens in a new tab
   * and works before this module loads; a button when your code shows it.
   * A link that goes nowhere (Previous on the first page) keeps its place and
   * its role, disabled, but has no href, so it is not a tab stop.
   */
  _control(part, page, { label, current = false, disabled = false }) {
    const href = this.getAttribute('href');
    let control;
    if (href !== null) {
      control = document.createElement('a');
      if (disabled) {
        control.setAttribute('role', 'link');
        control.setAttribute('aria-disabled', 'true');
      } else {
        control.setAttribute('href', href.replaceAll('{page}', String(page)));
        if (part !== 'page') control.setAttribute('rel', part === 'previous' ? 'prev' : 'next');
      }
    } else {
      control = document.createElement('button');
      control.type = 'button';
      control.disabled = disabled;
    }

    control.setAttribute('data-pagination-part', part);
    control.dataset.paginationPage = String(page);
    control.dataset.paginationKey = part === 'page' ? `page-${page}` : part;

    if (part === 'page') {
      control.textContent = String(page);
      control.setAttribute('aria-label', label);
      if (current) control.setAttribute('aria-current', 'page');
    } else {
      const text = document.createElement('span');
      text.setAttribute('data-pagination-part', 'label');
      text.textContent = label;
      control.append(text);
      control.insertAdjacentHTML(part === 'previous' ? 'afterbegin' : 'beforeend', CHEVRON[part]);
    }
    return control;
  }

  /**
   * Where the full list does not fit on one line it is drawn compact: no page
   * either side of the current one, five slots rather than seven, and
   * Previous and Next as arrows alone. The full list is tried first each
   * time, so it comes back once there is room for it.
   */
  _fit() {
    if (!this.isConnected || this.pages < 2) return;
    this._setCompact(false);
    if (this._wraps()) this._setCompact(true);
  }

  _setCompact(compact) {
    if (compact === this._compact) return;
    this._compact = compact;
    this.toggleAttribute('data-compact', compact);
    this._render(this.pages);
  }

  _wraps() {
    const items = this._list.children;
    return items.length > 1 && items[items.length - 1].offsetTop > items[0].offsetTop + 1;
  }

  /** A button's default: show the page, and say which page it is. */
  _show(page) {
    if (page === this.page) return;
    this.page = page;
    const text = this._text('page-text', 'Page {page}').replaceAll('{page}', String(this.page));
    clearTimeout(this._statusTimer);
    this._status.textContent = '';
    this._statusTimer = setTimeout(() => {
      this._status.textContent = text;
    }, STATUS_DELAY);
  }

  _text(name, fallback) {
    return this.getAttribute(name) || fallback;
  }
}

/**
 * The pages to list, with null for a gap. Past `2 * siblings + 5` pages the
 * list keeps the first page, the last, and the current one with `siblings`
 * either side; near either end the run widens instead of leaving a gap that
 * would hide a single page. So the list is always the same length, and the
 * row keeps its width as the current page moves.
 */
export function pageWindow(page, pages, siblings = 1) {
  const slots = 2 * siblings + 5;
  if (pages <= slots) return run(1, pages);

  let start = page - siblings;
  let end = page + siblings;
  if (page <= siblings + 3) {
    start = 2;
    end = 2 * siblings + 3;
  } else if (page >= pages - siblings - 2) {
    start = pages - 2 * siblings - 2;
    end = pages - 1;
  }

  return [1, ...(start > 2 ? [null] : []), ...run(start, end), ...(end < pages - 1 ? [null] : []), pages];
}

function run(from, to) {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function wholeNumber(value) {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}
