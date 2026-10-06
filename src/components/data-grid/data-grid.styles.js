// Light-DOM styles for aihio-data-grid.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.
//
// The grid looks like aihio-table, whose stylesheet draws both. These are
// the rules virtualized rows need on top of that look.

const TABLE = 'aihio-data-grid > table';
const CELL = `${TABLE} > :is(thead, tbody) > tr > :is(th, td)`;

export default {
  'aihio-data-grid': `
    /* The grid is a box of its own height that its rows scroll in. It is
       positioned so the rows' offsets are measured from it. The grid places
       its rows itself, so the browser's scroll anchoring, which would move
       the view when a spacer above it changes height, is off. */
    aihio-data-grid {
      display: block;
      position: relative;
      width: 100%;
      height: var(--aihio-data-grid-height);
      overflow: auto;
      overflow-anchor: none;
    }

    /* Only the rows in view exist, so nothing may size from them: the
       columns take their widths from <col> elements or the header cells, and
       every row is one line high. Text that does not fit ends in an
       ellipsis rather than wrapping. */
    ${TABLE} {
      table-layout: fixed;
    }

    ${CELL} {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Cells are focused by the arrow keys, so a cell draws its own ring,
       inside its edge, where the scroll box cannot clip it. */
    ${CELL}:focus-visible {
      outline: 2px solid var(--aihio-color-focus-ring);
      outline-offset: -2px;
    }

    /* The sections above and below the rendered rows only take up the room
       of the rows that are not. */
    ${TABLE} > tbody[data-grid-part] > tr > td {
      padding: 0;
      border: 0;
    }

    @media print {
      aihio-data-grid {
        height: auto;
        overflow: visible;
      }

      ${TABLE} > thead > tr > th {
        position: static;
      }
    }

    @media (forced-colors: active) {
      ${CELL}:focus-visible {
        outline-color: Highlight;
      }
    }
  `,
};
