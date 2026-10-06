// Light-DOM styles for aihio-pagination.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

const CONTROL = 'aihio-pagination > [data-pagination-part="list"] > li > :is(a, button)';
const DISABLED = `${CONTROL}:is(:disabled, [aria-disabled="true"])`;

export default {
  'aihio-pagination': `
    aihio-pagination {
      display: block;
    }

    /* The list is rendered by the module. Hold its height until then, so the
       content under it does not jump when it appears. */
    aihio-pagination:not(:defined) {
      min-height: var(--aihio-button-height-sm);
    }

    /* Fewer than two pages: nothing to page through. */
    aihio-pagination[data-empty] {
      display: none;
    }

    aihio-pagination > [data-pagination-part="list"] {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--aihio-spacing-cluster-gap-tight);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    aihio-pagination > [data-pagination-part="list"] > li {
      display: flex;
    }

    /* Drawn as the system's small ghost buttons, square for a number. */
    ${CONTROL},
    aihio-pagination [data-pagination-part="gap"] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--aihio-spacing-cluster-gap-tight);
      box-sizing: border-box;
      min-width: var(--aihio-button-height-sm);
      height: var(--aihio-button-height-sm);
      margin: 0;
      padding-inline: var(--aihio-spacing-control-gap);
      border: 1px solid transparent;
      border-radius: var(--aihio-radius-interactive-compact);
      font-size: var(--aihio-font-size-control);
      line-height: var(--aihio-line-height-compact);
      white-space: nowrap;
    }

    ${CONTROL} {
      background-color: transparent;
      color: var(--aihio-color-page-fg);
      font-family: inherit;
      font-weight: var(--aihio-font-weight-control);
      font-variant-numeric: tabular-nums;
      text-decoration: none;
      cursor: pointer;
      transition: background-color var(--aihio-duration-feedback) ease,
                  color var(--aihio-duration-feedback) ease;
    }

    ${CONTROL}:hover {
      background-color: var(--aihio-color-control-highlight-bg);
      color: var(--aihio-color-control-highlight-fg);
    }

    ${CONTROL}:focus-visible {
      outline: 2px solid var(--aihio-color-focus-ring);
      outline-offset: 2px;
    }

    /* The current page is marked by a border held to 3:1 and a heavier
       weight, not by a fill or a colour alone. */
    ${CONTROL}[aria-current="page"] {
      border-color: var(--aihio-color-field-border);
      font-weight: var(--aihio-font-weight-heading);
    }

    ${DISABLED} {
      cursor: not-allowed;
      opacity: 0.5;
      pointer-events: none;
    }

    aihio-pagination [data-pagination-part="gap"] {
      color: var(--aihio-color-muted-fg);
      user-select: none;
    }

    aihio-pagination > [data-pagination-part="status"] {
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

    /* Drawn compact, where the full list does not fit on one line, the
       controls close up, and Previous and Next keep only their arrows: it
       then fits a 320px phone. The words stay in the page, out of sight, so
       their names do not change. */
    aihio-pagination[data-compact] > [data-pagination-part="list"] {
      gap: 0;
    }

    aihio-pagination[data-compact] > [data-pagination-part="list"] > li > :is(a, button) > [data-pagination-part="label"] {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    @media (forced-colors: active) {
      ${CONTROL} {
        color: LinkText;
      }

      aihio-pagination > [data-pagination-part="list"] > li > button {
        color: ButtonText;
      }

      ${CONTROL}:focus-visible {
        outline-color: Highlight;
      }

      ${CONTROL}[aria-current="page"] {
        forced-color-adjust: none;
        border-color: Highlight;
        background-color: Highlight;
        color: HighlightText;
      }

      ${DISABLED} {
        color: GrayText;
        opacity: 1;
      }
    }
  `,
};
