// Light-DOM styles for aihio-date-picker: the field, its button, and the
// popup. The month grid inside the popup is drawn by the rules it shares with
// aihio-calendar, in calendar.styles.js.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

const field = (state = '') => `aihio-date-picker [data-date-picker-part="input"]${state}`;
const toggle = (state = '') => `aihio-date-picker [data-date-picker-part="toggle"]${state}`;
const popup = (state = '') => `aihio-date-picker [data-date-picker-part="popup"]${state}`;

export default {
  'aihio-date-picker': `
    aihio-date-picker {
      display: inline-flex;
      position: relative;
      width: 100%;
    }

    /* Hold the field's box before upgrade so server-rendered markup does not
       jump when the input appears. */
    aihio-date-picker:not(:defined) {
      box-sizing: border-box;
      height: var(--aihio-input-height-md);
      border: 1px solid var(--aihio-color-field-border);
      border-radius: var(--aihio-radius-interactive);
    }

    ${field()} {
      display: flex;
      width: 100%;
      height: var(--aihio-input-height-md);
      margin: 0;
      border-radius: var(--aihio-radius-interactive);
      border: 1px solid var(--aihio-color-field-border);
      background-color: transparent;
      padding-block: var(--aihio-spacing-field-padding-block);
      padding-inline: var(--aihio-spacing-field-padding-inline) var(--aihio-input-height-md);
      font: inherit;
      font-size: var(--aihio-font-size-control);
      font-variant-numeric: tabular-nums;
      line-height: var(--aihio-line-height-body);
      color: var(--aihio-color-page-fg);
      text-overflow: ellipsis;
      transition: border-color var(--aihio-duration-feedback) ease,
                  box-shadow var(--aihio-duration-feedback) ease;
    }

    ${field('::placeholder')} {
      color: var(--aihio-color-muted-fg);
    }

    ${field(':focus-visible')} {
      outline: none;
      border-color: var(--aihio-color-focus-ring);
      box-shadow: 0 0 0 1px var(--aihio-color-focus-ring);
    }

    ${field(':disabled')} {
      cursor: not-allowed;
      opacity: 0.5;
    }

    aihio-date-picker[size="sm"] [data-date-picker-part="input"] {
      height: var(--aihio-input-height-sm);
      font-size: var(--aihio-font-size-control-sm);
      padding-block: var(--aihio-spacing-field-padding-block-sm);
      padding-inline: var(--aihio-spacing-field-padding-inline-sm) var(--aihio-input-height-sm);
    }
    aihio-date-picker[size="lg"] [data-date-picker-part="input"] {
      height: var(--aihio-input-height-lg);
      font-size: var(--aihio-font-size-control-lg);
      padding-block: var(--aihio-spacing-field-padding-block-lg);
      padding-inline: var(--aihio-spacing-field-padding-inline-lg) var(--aihio-input-height-lg);
    }

    aihio-date-picker[error] [data-date-picker-part="input"] {
      border-color: var(--aihio-color-destructive-bg);
    }
    aihio-date-picker[error] [data-date-picker-part="input"]:focus-visible {
      border-color: var(--aihio-color-destructive-bg);
      box-shadow: 0 0 0 1px var(--aihio-color-destructive-bg);
    }

    /* Inside the field's box, at its end. Unlike the combobox's chevron it is
       a tab stop: the keyboard opens the calendar from it. It is as tall as
       the field, not the element, which a grid or flex row can stretch past
       the field. */
    ${toggle()} {
      position: absolute;
      inset-block-start: 0;
      inset-inline-end: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--aihio-input-height-md);
      height: var(--aihio-input-height-md);
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: var(--aihio-radius-interactive);
      background: none;
      color: var(--aihio-color-muted-fg);
      cursor: pointer;
      transition: color var(--aihio-duration-feedback-fast) ease;
    }
    aihio-date-picker[size="sm"] [data-date-picker-part="toggle"] {
      width: var(--aihio-input-height-sm);
      height: var(--aihio-input-height-sm);
    }
    aihio-date-picker[size="lg"] [data-date-picker-part="toggle"] {
      width: var(--aihio-input-height-lg);
      height: var(--aihio-input-height-lg);
    }

    ${toggle(':hover')},
    aihio-date-picker[open] [data-date-picker-part="toggle"] {
      color: var(--aihio-color-page-fg);
    }

    /* Inset, so the ring sits inside the field's border rather than across it. */
    ${toggle(':focus-visible')} {
      outline: 2px solid var(--aihio-color-focus-ring);
      outline-offset: -4px;
    }

    ${toggle(':disabled')} {
      cursor: not-allowed;
      opacity: 0.5;
    }

    aihio-date-picker [data-date-picker-part="toggle-label"] {
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

    /* Shown in the top layer as a manual popover, so it escapes overflow
       clipping and sits above an open dialog. Selector specificity beats the
       UA [popover] rules (inset: 0, margin: auto) it has to undo. */
    ${popup()} {
      --aihio-calendar-highlight-bg: var(--aihio-color-overlay-highlight-bg);
      --aihio-date-picker-shift: calc(var(--aihio-spacing-cluster-gap-tight) * -1);

      display: none;
      position: fixed;
      inset: auto;
      z-index: 50;
      box-sizing: border-box;
      width: max-content;
      max-width: calc(100vw - 1rem);
      max-height: var(--aihio-date-picker-available-height, none);
      margin: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: var(--aihio-spacing-control-gap);
      border: 1px solid var(--aihio-color-border-subtle);
      border-radius: var(--aihio-radius-surface);
      background-color: var(--aihio-color-overlay-bg);
      color: var(--aihio-color-overlay-fg);
      box-shadow: var(--aihio-shadow-overlay);
    }
    ${popup('[data-side="top"]')} {
      --aihio-date-picker-shift: var(--aihio-spacing-cluster-gap-tight);
    }
    ${popup(':popover-open')},
    ${popup('[data-fallback-open]')} {
      display: block;
      animation: aihio-date-picker-in var(--aihio-duration-feedback) ease;
    }

    @keyframes aihio-date-picker-in {
      from {
        opacity: 0;
        transform: translateY(var(--aihio-date-picker-shift));
      }
    }

    @media (prefers-reduced-motion: reduce) {
      ${popup(':popover-open')},
      ${popup('[data-fallback-open]')} {
        animation: none;
      }
    }

    @media (forced-colors: active) {
      ${field()} {
        background-color: Field;
        color: FieldText;
        border-color: FieldText;
      }

      ${field(':focus-visible')} {
        outline: 2px solid Highlight;
        outline-offset: 2px;
        box-shadow: none;
      }

      ${field(':disabled')} {
        color: GrayText;
        border-color: GrayText;
        opacity: 1;
      }

      aihio-date-picker[error] [data-date-picker-part="input"] {
        border-width: 2px;
        border-color: FieldText;
      }

      ${toggle()} {
        color: ButtonText;
      }

      ${toggle(':focus-visible')} {
        outline-color: Highlight;
      }

      ${toggle(':disabled')} {
        color: GrayText;
        opacity: 1;
      }

      ${popup()} {
        border-color: CanvasText;
      }
    }
  `,
};
