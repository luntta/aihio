// Light-DOM styles for aihio-table, and the look aihio-data-grid shares.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

/* The look of a table, shared by aihio-table and aihio-data-grid: the grid
   adds what virtualizing its rows needs in data-grid.styles.js.

   Every selector reaches its cells through the table's own structure, so a
   table nested inside a cell keeps the browser's defaults (or its own
   component's), and none of these leak into it. The structural selectors are
   all type selectors, so an author's class still overrides them. */
const HOSTS = ':is(aihio-table, aihio-data-grid)';
const TABLE = `${HOSTS} > table`;
const ROW = (section) => `${TABLE} > ${section} > tr`;
const CELL = `${TABLE} > :is(thead, tbody, tfoot) > tr > :is(th, td)`;
const HEAD = `${ROW('thead')} > th`;
const SORT = `${HEAD} > [data-table-part="sort"]`;

export default {
  'aihio-table': `
    /* --aihio-table-bg is the colour behind the table, which a sticky header
       paints so rows scroll under it rather than through it. */
    ${HOSTS} {
      --aihio-table-bg: var(--aihio-color-page-bg);
      --aihio-table-row-hover-bg: var(--aihio-color-muted-bg);
      --aihio-table-cell-padding-y: var(--aihio-table-cell-padding-y-default);
    }

    /* The table scrolls inside its own box rather than pushing the page
       sideways. */
    aihio-table {
      --aihio-table-edge-shadow: color-mix(in oklch, var(--aihio-color-page-fg) 16%, transparent);
      --aihio-table-edge-start: 0 0 transparent;
      --aihio-table-edge-end: 0 0 transparent;

      display: block;
      /* Like aihio-grid, it takes its whole row: sized to its content inside
         a parent that does not stretch it, it would never be narrower than
         the table and never scroll. */
      width: 100%;
      overflow-x: auto;
      /* A sideways swipe at the edge scrolls nothing else, and does not go
         back a page. */
      overscroll-behavior-x: contain;
      box-shadow: var(--aihio-table-edge-start), var(--aihio-table-edge-end);
    }

    /* On a raised surface the table sits on that surface, and a hovered row
       steps back down to the canvas: the same pair of neutrals either way
       round, both of which keep muted text above 4.5:1. */
    :is(aihio-card, aihio-dialog) ${HOSTS} {
      --aihio-table-bg: var(--aihio-color-surface-bg);
      --aihio-table-row-hover-bg: var(--aihio-color-page-bg);
    }

    ${HOSTS}[density="compact"] {
      --aihio-table-cell-padding-y: var(--aihio-table-cell-padding-y-compact);
    }

    /* A shadow inside an edge that has rows scrolled past it, so a table cut
       off at a column boundary does not look like it ends there. */
    aihio-table[data-overflow-start] {
      --aihio-table-edge-start: inset 0.75rem 0 0.75rem -0.75rem var(--aihio-table-edge-shadow);
    }
    aihio-table[data-overflow-end] {
      --aihio-table-edge-end: inset -0.75rem 0 0.75rem -0.75rem var(--aihio-table-edge-shadow);
    }
    aihio-table[data-overflow-start]:dir(rtl) {
      --aihio-table-edge-start: inset -0.75rem 0 0.75rem -0.75rem var(--aihio-table-edge-shadow);
    }
    aihio-table[data-overflow-end]:dir(rtl) {
      --aihio-table-edge-end: inset 0.75rem 0 0.75rem -0.75rem var(--aihio-table-edge-shadow);
    }

    aihio-table[sticky-header] {
      max-height: var(--aihio-table-max-height);
      overflow: auto;
    }

    /* Cells, not the rows or the header group, carry the borders and stick:
       a collapsed border belongs to the table and scrolls away from a sticky
       cell, and sticky table rows are not supported everywhere. */
    ${TABLE} {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: var(--aihio-font-size-body-sm);
      line-height: var(--aihio-line-height-body);
    }

    ${TABLE} > caption {
      caption-side: top;
      padding: 0 var(--aihio-table-cell-padding-x) var(--aihio-spacing-stack-sm);
      text-align: start;
      font-size: var(--aihio-font-size-body);
      font-weight: var(--aihio-font-weight-heading);
      line-height: var(--aihio-line-height-compact);
      letter-spacing: var(--aihio-letter-spacing-heading);
    }

    ${CELL} {
      padding: var(--aihio-table-cell-padding-y) var(--aihio-table-cell-padding-x);
      border-bottom: 1px solid var(--aihio-color-border-subtle);
      text-align: start;
      vertical-align: middle;
    }

    ${HEAD} {
      font-weight: var(--aihio-font-weight-control);
      color: var(--aihio-color-muted-fg);
      white-space: nowrap;
    }

    /* The cell that names its row reads as the row's key. */
    ${ROW('tbody')} > th,
    ${ROW('tfoot')} > :is(th, td) {
      font-weight: var(--aihio-font-weight-control);
    }

    /* A record's name, a figure, and a date read as one token: broken at a
       hyphen ("INV-" over "1042") or a comma they stop scanning down the
       column. They hold together and the table scrolls instead; text in
       other cells still wraps, so a column of descriptions stays readable. */
    ${ROW('tbody')} > th,
    ${CELL}[data-numeric],
    ${CELL} time {
      white-space: nowrap;
    }

    /* The last row needs no divider beneath it; a footer's totals keep the
       one above them. */
    ${TABLE} > tbody:last-child > tr:last-child > :is(th, td),
    ${ROW('tfoot')}:last-child > :is(th, td) {
      border-bottom: 0;
    }

    /* Figures line up by place value: end-aligned, in tabular digits. */
    ${CELL}[data-numeric] {
      text-align: end;
      font-variant-numeric: tabular-nums;
    }

    /* A link in a cell inherits the text colour, so the underline is what
       marks it as a link. Controls drawn as links (aihio-button, a menu item)
       style their own. */
    ${CELL} > a {
      color: inherit;
      text-decoration-line: underline;
      text-decoration-color: color-mix(in oklch, currentColor 40%, transparent);
      text-underline-offset: 0.2em;
    }
    ${CELL} > a:hover {
      text-decoration-color: currentColor;
    }

    @media (hover: hover) {
      ${TABLE} > tbody:not([data-grid-part]) > tr:hover {
        background-color: var(--aihio-table-row-hover-bg);
      }
    }

    :is(aihio-table[sticky-header], aihio-data-grid) > table > thead > tr > th {
      position: sticky;
      /* Rows of a header below the first stick under the rows above them;
         the element measures them. */
      top: var(--aihio-table-sticky-top, 0px);
      z-index: 1;
      background-color: var(--aihio-table-bg);
    }

    /* Stale rows while new ones load. aria-busy on the table says the same
       to assistive technology. */
    ${HOSTS}[loading] > table > tbody {
      opacity: 0.5;
      transition: opacity var(--aihio-duration-feedback) ease;
    }
    ${HOSTS}[loading] {
      cursor: progress;
    }

    /* A sortable header is its button: the cell's padding moves onto the
       button, so the whole cell sorts and the header is exactly as tall as
       its neighbours. */
    ${HEAD}:has(> [data-table-part="sort"]) {
      padding: 0;
    }

    ${SORT} {
      display: flex;
      align-items: center;
      gap: var(--aihio-spacing-cluster-gap-tight);
      box-sizing: border-box;
      width: 100%;
      margin: 0;
      padding: var(--aihio-table-cell-padding-y) var(--aihio-table-cell-padding-x);
      border: 0;
      border-radius: 0;
      background: none;
      color: inherit;
      font: inherit;
      letter-spacing: inherit;
      text-align: inherit;
      white-space: inherit;
      cursor: pointer;
      transition: color var(--aihio-duration-feedback-fast) ease;
    }

    /* Inset, so the scroll box never clips the ring of a header at its
       edge. */
    ${SORT}:focus-visible {
      outline: 2px solid var(--aihio-color-focus-ring);
      outline-offset: -2px;
    }

    ${SORT}:hover,
    ${HEAD}:is([aria-sort="ascending"], [aria-sort="descending"]) {
      color: var(--aihio-color-page-fg);
    }

    ${SORT} > [data-table-part="label"] {
      min-width: 0;
    }

    /* In a numeric column the indicator goes before the label, so the label
       lines up with the figures beneath it. */
    ${HEAD}[data-numeric] > [data-table-part="sort"] {
      flex-direction: row-reverse;
    }

    /* Both chevrons while the column is not sorted; the one for the order
       when it is, centred. The direction reads from the shape, not only the
       colour. */
    ${SORT} > [data-table-part="sort-icon"] {
      flex: none;
    }
    ${SORT} > [data-table-part="sort-icon"] > path {
      transform-box: fill-box;
      transition: transform var(--aihio-duration-feedback) ease;
    }
    ${HEAD}[aria-sort="ascending"] [data-table-part="sort-icon"] > [data-direction="ascending"] {
      transform: translateY(3px);
    }
    ${HEAD}[aria-sort="descending"] [data-table-part="sort-icon"] > [data-direction="descending"] {
      transform: translateY(-3px);
    }
    ${HEAD}[aria-sort="ascending"] [data-table-part="sort-icon"] > [data-direction="descending"],
    ${HEAD}[aria-sort="descending"] [data-table-part="sort-icon"] > [data-direction="ascending"] {
      visibility: hidden;
    }

    /* Before the element upgrades a sortable header has no button yet. Hold
       the indicator's room so the column does not widen when it appears. */
    ${HEAD}[data-sortable]:not(:has(> [data-table-part="sort"]))::after,
    ${HEAD}[data-sortable][data-numeric]:not(:has(> [data-table-part="sort"]))::before {
      content: '';
      display: inline-block;
      width: calc(16px + var(--aihio-spacing-cluster-gap-tight));
    }
    ${HEAD}[data-sortable][data-numeric]:not(:has(> [data-table-part="sort"]))::after {
      content: none;
    }

    ${HOSTS} > [data-table-part="status"] {
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

    /* On paper there is nothing to scroll: every row prints, under a header
       the browser repeats on each page. */
    @media print {
      aihio-table,
      aihio-table[sticky-header] {
        max-height: none;
        overflow: visible;
        box-shadow: none;
      }

      aihio-table[sticky-header] > table > thead > tr > th {
        position: static;
      }
    }

    /* The sort buttons are drawn as the system's buttons, ButtonText on
       ButtonFace, which is what marks them as controls once the row
       dividers and hover fills are gone. */
    @media (forced-colors: active) {
      ${SORT} {
        color: ButtonText;
      }

      ${SORT}:focus-visible {
        outline-color: Highlight;
      }
    }
  `,
};
