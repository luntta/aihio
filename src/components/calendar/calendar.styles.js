// Light-DOM styles for aihio-calendar, and for the month grid it shares with
// the popup of aihio-date-picker.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

const HOSTS = ':is(aihio-calendar, aihio-date-picker)';
const at = (part, state = '') => `${HOSTS} [data-calendar-part="${part}"]${state}`;
const DAY = `${HOSTS} [data-calendar-part="grid"] td[data-date]`;
const CONTROLS = `${HOSTS} :is([data-calendar-part="previous"], [data-calendar-part="next"], [data-calendar-part="month"], [data-calendar-part="year"])`;
const STEPS = `${HOSTS} :is([data-calendar-part="previous"], [data-calendar-part="next"])`;
const SELECTS = `${HOSTS} :is([data-calendar-part="month"], [data-calendar-part="year"])`;

export default {
  'aihio-calendar': `
    aihio-calendar {
      /* The fill a hovered day or control takes. The date picker's popup sets
         its own, because on the overlay surface this one is invisible in the
         dark theme. */
      --aihio-calendar-highlight-bg: var(--aihio-color-control-highlight-bg);

      display: inline-block;
      vertical-align: top;
      padding: var(--aihio-spacing-control-gap);
      border: 1px solid var(--aihio-color-border-subtle);
      border-radius: var(--aihio-radius-surface);
      color: var(--aihio-color-page-fg);
    }

    /* Hold the calendar's box before upgrade, so server-rendered markup does
       not jump when the grid appears. */
    aihio-calendar:not(:defined) {
      box-sizing: content-box;
      width: calc(var(--aihio-calendar-cell-size) * 7);
      height: calc(var(--aihio-calendar-cell-size) * 8 + var(--aihio-spacing-cluster-gap-tight));
    }

    /* In a field the calendar keeps its own width, under its label. */
    aihio-field > aihio-calendar {
      align-self: flex-start;
    }

    aihio-calendar[error] {
      border-color: var(--aihio-color-destructive-bg);
    }

    aihio-calendar[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    ${at('header')} {
      display: flex;
      align-items: center;
      gap: var(--aihio-spacing-cluster-gap-tight);
      margin-block-end: var(--aihio-spacing-cluster-gap-tight);
    }

    ${at('caption')} {
      display: flex;
      flex: 1;
      justify-content: center;
      min-width: 0;
    }

    ${CONTROLS} {
      box-sizing: border-box;
      height: var(--aihio-calendar-cell-size);
      margin: 0;
      border: 1px solid transparent;
      border-radius: var(--aihio-radius-interactive-compact);
      background-color: transparent;
      color: inherit;
      font-family: inherit;
      font-size: var(--aihio-font-size-control);
      font-weight: var(--aihio-font-weight-control);
      line-height: var(--aihio-line-height-compact);
      cursor: pointer;
      transition: background-color var(--aihio-duration-feedback-fast) ease;
    }

    ${STEPS} {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: var(--aihio-calendar-cell-size);
      padding: 0;
    }

    /* The chevrons point the way the months run. */
    ${STEPS} svg:dir(rtl) {
      transform: scaleX(-1);
    }

    /* The month and year read as the heading they replace, each with the
       chevron of a select. It is two gradient triangles in currentColor, so
       it follows the theme and forced colours without an image. */
    ${SELECTS} {
      appearance: none;
      min-width: 0;
      padding-inline: var(--aihio-spacing-field-padding-inline-sm) calc(var(--aihio-spacing-field-padding-inline-sm) + 0.875rem);
      background-image:
        linear-gradient(45deg, transparent 50%, currentColor 50%),
        linear-gradient(135deg, currentColor 50%, transparent 50%);
      background-position:
        right calc(var(--aihio-spacing-field-padding-inline-sm) + 4px) center,
        right var(--aihio-spacing-field-padding-inline-sm) center;
      background-size: 4px 4px;
      background-repeat: no-repeat;
      field-sizing: content;
    }

    ${SELECTS}:dir(rtl) {
      background-position:
        left var(--aihio-spacing-field-padding-inline-sm) center,
        left calc(var(--aihio-spacing-field-padding-inline-sm) + 4px) center;
    }

    ${CONTROLS}:hover {
      background-color: var(--aihio-calendar-highlight-bg);
    }

    ${CONTROLS}:focus-visible {
      outline: 2px solid var(--aihio-color-focus-ring);
      outline-offset: 0;
    }

    ${STEPS}[aria-disabled="true"],
    ${CONTROLS}:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    ${STEPS}[aria-disabled="true"]:hover {
      background-color: transparent;
    }

    ${at('grid')} {
      border-collapse: separate;
      border-spacing: 0;
      font-size: var(--aihio-font-size-control);
      line-height: var(--aihio-line-height-compact);
    }

    ${at('grid')} :is(th, td) {
      box-sizing: border-box;
      width: var(--aihio-calendar-cell-size);
      height: var(--aihio-calendar-cell-size);
      padding: 0;
      text-align: center;
      vertical-align: middle;
    }

    ${at('grid')} th {
      color: var(--aihio-color-muted-fg);
      font-size: var(--aihio-font-size-control-sm);
      font-weight: var(--aihio-font-weight-body);
    }

    ${DAY} {
      position: relative;
      border-radius: var(--aihio-radius-interactive-compact);
      font-variant-numeric: tabular-nums;
      cursor: pointer;
      user-select: none;
      transition: background-color var(--aihio-duration-feedback-fast) ease;
    }

    ${DAY}:hover {
      background-color: var(--aihio-calendar-highlight-bg);
    }

    /* Outside the cell, so the ring still shows around a chosen day's fill,
       and above the days beside it, which would otherwise paint over it. */
    ${DAY}:focus-visible {
      z-index: 1;
      outline: 2px solid var(--aihio-color-focus-ring);
      outline-offset: 1px;
    }

    /* The days of the months either side, muted. */
    ${DAY}[data-outside] {
      color: var(--aihio-color-muted-fg);
    }

    ${DAY}[aria-selected="true"] {
      background-color: var(--aihio-color-primary-action-bg);
      color: var(--aihio-color-primary-action-fg);
      font-weight: var(--aihio-font-weight-control);
    }

    ${DAY}[aria-selected="true"]:hover {
      background-color: color-mix(in oklch, var(--aihio-color-primary-action-bg) 90%, transparent);
    }

    /* Today is marked by weight and a dot, not by a colour. The dot is a
       border, so forced colours keep it. */
    ${DAY}[aria-current="date"] {
      font-weight: var(--aihio-font-weight-heading);
    }

    ${DAY}[aria-current="date"]::after {
      content: "";
      position: absolute;
      inset-block-end: 0.25rem;
      inset-inline-start: 50%;
      translate: -50% 0;
      border: 2px solid currentColor;
      border-radius: var(--aihio-radius-pill);
    }

    ${DAY}[aria-current="date"]:dir(rtl)::after {
      translate: 50% 0;
    }

    /* A day that cannot be chosen is struck through, which reads without
       colour, and keeps a text colour held to 4.5:1. */
    ${DAY}[aria-disabled="true"] {
      color: var(--aihio-color-muted-fg);
      text-decoration: line-through;
      cursor: not-allowed;
    }

    ${DAY}[aria-disabled="true"]:not([aria-selected="true"]):hover,
    :is(aihio-calendar[readonly], aihio-calendar[disabled]) [data-calendar-part="grid"] td[data-date]:not([aria-selected="true"]):hover {
      background-color: transparent;
    }

    aihio-calendar[readonly] [data-calendar-part="grid"] td[data-date] {
      cursor: default;
    }

    aihio-calendar[disabled] [data-calendar-part="grid"] td[data-date] {
      cursor: not-allowed;
    }

    ${at('status')} {
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

    /* A finger needs a larger target than a pointer. Seven days of it still
       fit a 320px phone. */
    @media (pointer: coarse) {
      ${at('grid')} :is(th, td),
      ${STEPS} {
        width: calc(var(--aihio-calendar-cell-size) + 0.25rem);
      }

      ${at('grid')} td,
      ${CONTROLS} {
        height: calc(var(--aihio-calendar-cell-size) + 0.25rem);
      }
    }

    @media (forced-colors: active) {
      aihio-calendar {
        border-color: CanvasText;
      }

      aihio-calendar[error] {
        border-width: 2px;
      }

      ${CONTROLS} {
        color: ButtonText;
      }

      /* Forced colours drop the gradient chevron, so the selects go back to
         the platform's own drawing, arrow and all. */
      ${SELECTS} {
        appearance: auto;
      }

      ${STEPS}[aria-disabled="true"],
      ${CONTROLS}:disabled {
        color: GrayText;
        opacity: 1;
      }

      ${CONTROLS}:focus-visible,
      ${DAY}:focus-visible {
        outline-color: Highlight;
      }

      /* Opt the chosen day out of adjustment, which would draw a Canvas
         backplate behind its text, and state its colours instead. */
      ${DAY}[aria-selected="true"] {
        forced-color-adjust: none;
        background-color: Highlight;
        color: HighlightText;
      }

      /* The only muted system colour, so the days around the month still
         read as another month's. */
      ${DAY}:is([data-outside], [aria-disabled="true"]) {
        color: GrayText;
      }
    }
  `,
};
