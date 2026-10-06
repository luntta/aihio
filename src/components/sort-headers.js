// Sortable column headers, shared by aihio-table and aihio-data-grid.
//
// A header with data-sortable gets a <button> inside the <th>, the shape the
// WAI-ARIA sortable table uses: the button sorts, and the <th> keeps its role
// and carries aria-sort. Both components mark and announce a sort the same
// way; what they do with the rows afterwards is their own.

// The two orders a header can claim. none, other, or no aria-sort at all
// leaves the rows as they are.
export const SORTED = new Set(['ascending', 'descending']);

const SORT_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" data-table-part="sort-icon"><path data-direction="ascending" d="M5 6.5l3-3 3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path data-direction="descending" d="M5 9.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export class SortableHeaders {
  constructor() {
    this._states = new Map();
  }

  /** Adopt the sortable headers of `table`, and release those that no longer are. */
  sync(table) {
    const sortable = new Set(headerCells(table).filter((cell) => cell.hasAttribute('data-sortable')));

    for (const [header, state] of this._states) {
      if (sortable.has(header)) continue;
      releaseHeader(header, state);
      this._states.delete(header);
    }

    for (const header of sortable) this._adopt(header);
  }

  /** Release every header, as when the table they belong to is replaced. */
  releaseAll() {
    for (const [header, state] of this._states) releaseHeader(header, state);
    this._states.clear();
  }

  has(header) {
    return this._states.has(header);
  }

  headers() {
    return [...this._states.keys()];
  }

  /** The sort button of `header`, or null when it is not sortable. */
  button(header) {
    return this._states.get(header)?.button ?? null;
  }

  /**
   * The header whose sort button `target` is in, or null. A table nested in a
   * cell sorts itself; its clicks bubble through its host's ancestors too, and
   * its headers are not this one's.
   */
  headerFor(target) {
    const button = target?.closest?.('[data-table-part="sort"]');
    const header = button?.parentElement;
    return header && this._states.get(header)?.button === button ? header : null;
  }

  /** The header named `column`: its data-sortable value, or its text. */
  find(column) {
    const name = String(column ?? '').trim();
    return this.headers().find((header) => columnName(header) === name || headerLabel(header) === name) ?? null;
  }

  /**
   * A sortable header's content moves into a generated <button>. A <button>
   * the author wrote is adopted instead, which is how a framework keeps the
   * whole header.
   */
  _adopt(header) {
    let state = this._states.get(header);
    const control = header.querySelector(':scope > button');

    if (!state || (control && control !== state.button)) {
      if (state?.created) state.button.remove();
      state = control ? adoptButton(control) : createButton(header);
      this._states.set(header, state);
    }

    if (state.created) {
      // A framework updating a header's text replaces all of the <th>'s
      // children, the button included. The new text then replaces the old
      // label rather than joining it; anything else added is appended.
      const strays = [...header.childNodes].filter((node) => node !== state.button);
      if (strays.length > 0) {
        if (state.button.parentNode !== header && state.label.hasChildNodes()) {
          state.label.replaceChildren(...strays);
        } else {
          state.label.append(...strays);
        }
      }
    }

    if (state.button.parentNode !== header) header.append(state.button);
    if (!state.button.querySelector(':scope > [data-table-part="sort-icon"]')) {
      state.button.insertAdjacentHTML('beforeend', SORT_ICON);
    }
  }
}

/** The header cells of a table's own <thead>. */
export function headerCells(table) {
  const rows = table?.tHead?.rows ?? [];
  return [...rows].flatMap((row) => [...row.cells].filter((cell) => cell.localName === 'th'));
}

/** Move aria-sort to `header`: one column is sorted at a time. */
export function markSorted(table, header, direction) {
  for (const cell of headerCells(table)) {
    if (cell === header) {
      if (cell.getAttribute('aria-sort') !== direction) cell.setAttribute('aria-sort', direction);
    } else if (cell.hasAttribute('aria-sort')) {
      cell.removeAttribute('aria-sort');
    }
  }
}

/** The direction a click on `header` sorts in: ascending first, then the other way. */
export function nextDirection(header) {
  return header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
}

/** What is announced after a sort, in the host's words when it gives them. */
export function sortAnnouncement(host, header, direction) {
  const template = direction === 'ascending'
    ? host.getAttribute('sort-ascending-text') || 'Sorted by {column}, ascending'
    : host.getAttribute('sort-descending-text') || 'Sorted by {column}, descending';
  return template.replaceAll('{column}', headerLabel(header));
}

export function headerLabel(header) {
  return normalizeSpace(header.textContent);
}

/** A column's name in aihio-sort: its data-sortable value, or its header's text. */
export function columnName(header) {
  return header.getAttribute('data-sortable')?.trim() || headerLabel(header);
}

function createButton(header) {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('data-table-part', 'sort');
  const label = document.createElement('span');
  label.setAttribute('data-table-part', 'label');
  label.append(...header.childNodes);
  button.append(label);
  header.append(button);
  return { button, label, created: true };
}

/** A button already in the header: the author's own, or a cloned table's. */
function adoptButton(button) {
  const label = button.querySelector(':scope > [data-table-part="label"]');
  button.setAttribute('data-table-part', 'sort');
  // Without a type a button in a form submits it.
  if (!button.hasAttribute('type')) button.type = 'button';
  return { button, label, created: Boolean(label) };
}

/** Hand a header that no longer sorts its content back. */
function releaseHeader(header, state) {
  const { button } = state;
  if (state.created) {
    if (button.parentNode === header) button.replaceWith(...state.label.childNodes);
    return;
  }
  button.removeAttribute('data-table-part');
  button.querySelector(':scope > [data-table-part="sort-icon"]')?.remove();
}

function normalizeSpace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
