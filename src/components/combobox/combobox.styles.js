// Light-DOM styles for aihio-combobox.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

const field = (state = '') => `aihio-combobox [data-combobox-part="input"]${state}`;

export default {
  'aihio-combobox': `
    aihio-combobox {
      display: inline-flex;
      position: relative;
      width: 100%;
    }

    /* The authored options are the data the list is rendered from, never the
       list itself: they stay hidden whether or not the element has upgraded. */
    aihio-combobox > aihio-option {
      display: none;
    }

    /* Hold the field's box before upgrade so server-rendered markup does not
       jump when the input appears. */
    aihio-combobox:not(:defined) {
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

    aihio-combobox[size="sm"] [data-combobox-part="input"] {
      height: var(--aihio-input-height-sm);
      font-size: var(--aihio-font-size-control-sm);
      padding-block: var(--aihio-spacing-field-padding-block-sm);
      padding-inline: var(--aihio-spacing-field-padding-inline-sm) var(--aihio-input-height-sm);
    }
    aihio-combobox[size="lg"] [data-combobox-part="input"] {
      height: var(--aihio-input-height-lg);
      font-size: var(--aihio-font-size-control-lg);
      padding-block: var(--aihio-spacing-field-padding-block-lg);
      padding-inline: var(--aihio-spacing-field-padding-inline-lg) var(--aihio-input-height-lg);
    }

    aihio-combobox[error] [data-combobox-part="input"] {
      border-color: var(--aihio-color-destructive-bg);
    }
    aihio-combobox[error] [data-combobox-part="input"]:focus-visible {
      border-color: var(--aihio-color-destructive-bg);
      box-shadow: 0 0 0 1px var(--aihio-color-destructive-bg);
    }

    /* A pointer affordance only: it is out of the tab order, and the keyboard
       opens the list from the input itself. */
    aihio-combobox [data-combobox-part="toggle"] {
      position: absolute;
      inset-block: 0;
      inset-inline-end: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--aihio-input-height-md);
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: var(--aihio-radius-interactive);
      background: none;
      color: var(--aihio-color-muted-fg);
      cursor: pointer;
      transition: color var(--aihio-duration-feedback-fast) ease;
    }
    aihio-combobox[size="sm"] [data-combobox-part="toggle"] {
      width: var(--aihio-input-height-sm);
    }
    aihio-combobox[size="lg"] [data-combobox-part="toggle"] {
      width: var(--aihio-input-height-lg);
    }
    aihio-combobox [data-combobox-part="toggle"]:hover {
      color: var(--aihio-color-page-fg);
    }
    aihio-combobox [data-combobox-part="toggle"]:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    aihio-combobox [data-combobox-part="toggle"] svg {
      transition: transform var(--aihio-duration-feedback) ease;
    }
    aihio-combobox[open] [data-combobox-part="toggle"] svg {
      transform: rotate(180deg);
    }

    /* Shown in the top layer as a manual popover, so it escapes overflow
       clipping and sits above an open dialog. Selector specificity beats the
       UA [popover] rules (inset: 0, margin: auto) it has to undo. */
    aihio-combobox [data-combobox-part="popup"] {
      display: none;
      position: fixed;
      inset: auto;
      z-index: 50;
      box-sizing: border-box;
      width: max-content;
      min-width: var(--aihio-combobox-anchor-width, 12rem);
      max-width: calc(100vw - 1rem);
      max-height: min(20rem, var(--aihio-combobox-available-height, 20rem));
      margin: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: var(--aihio-spacing-cluster-gap-tight);
      border: 1px solid var(--aihio-color-border-subtle);
      border-radius: var(--aihio-radius-interactive);
      background-color: var(--aihio-color-overlay-bg);
      color: var(--aihio-color-overlay-fg);
      box-shadow: var(--aihio-shadow-overlay);
      font-size: var(--aihio-font-size-control);
      line-height: var(--aihio-line-height-body);
      --aihio-combobox-shift: calc(var(--aihio-spacing-cluster-gap-tight) * -1);
    }
    aihio-combobox [data-combobox-part="popup"][data-side="top"] {
      --aihio-combobox-shift: var(--aihio-spacing-cluster-gap-tight);
    }
    aihio-combobox [data-combobox-part="popup"]:popover-open,
    aihio-combobox [data-combobox-part="popup"][data-fallback-open] {
      display: block;
      animation: aihio-combobox-in var(--aihio-duration-feedback) ease;
    }

    @keyframes aihio-combobox-in {
      from {
        opacity: 0;
        transform: translateY(var(--aihio-combobox-shift));
      }
    }

    aihio-combobox [role="option"] {
      display: flex;
      align-items: center;
      gap: var(--aihio-spacing-control-gap);
      padding: var(--aihio-spacing-stack-tight) var(--aihio-spacing-field-padding-inline-sm);
      border-radius: var(--aihio-radius-interactive-compact);
      cursor: pointer;
      user-select: none;
    }

    /* Author display rules beat the UA's [hidden] rule, so restate it for
       the options and panels this stylesheet gives a display value. */
    aihio-combobox [role="option"][hidden],
    aihio-combobox [data-combobox-part="popup"] [hidden] {
      display: none;
    }

    /* The active option is the keyboard focus indicator here — the input
       keeps DOM focus, so no outline is drawn — and its fill has to read
       against the overlay in both themes. */
    aihio-combobox [role="option"][data-active] {
      background-color: var(--aihio-color-overlay-highlight-bg);
      color: var(--aihio-color-overlay-fg);
    }

    aihio-combobox [role="option"][aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.5;
    }

    aihio-combobox [data-combobox-part="option-label"] {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    /* The matched run is set in bold rather than tinted: weight survives
       forced colours and needs no contrast pair of its own. */
    aihio-combobox [data-combobox-part="option-label"] mark {
      background: none;
      color: inherit;
      font-weight: var(--aihio-font-weight-heading);
    }

    aihio-combobox [data-combobox-part="check"] {
      flex: none;
      margin-inline-start: auto;
      visibility: hidden;
    }
    aihio-combobox [role="option"][aria-selected="true"] [data-combobox-part="check"] {
      visibility: visible;
    }

    aihio-combobox [data-combobox-part="message"] {
      display: flex;
      align-items: center;
      gap: var(--aihio-spacing-control-gap);
      padding: var(--aihio-spacing-stack-tight) var(--aihio-spacing-field-padding-inline-sm);
      color: var(--aihio-color-muted-fg);
      font-size: var(--aihio-font-size-body-sm);
    }

    aihio-combobox [data-combobox-part="message"][data-loading]::before {
      content: '';
      flex: none;
      width: 0.875em;
      height: 0.875em;
      border: 2px solid currentColor;
      border-inline-end-color: transparent;
      border-radius: var(--aihio-radius-pill);
      animation: aihio-combobox-spin var(--aihio-duration-spinner) linear infinite;
    }

    @keyframes aihio-combobox-spin {
      to {
        transform: rotate(360deg);
      }
    }

    aihio-combobox [data-combobox-part="status"] {
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

    @media (prefers-reduced-motion: reduce) {
      aihio-combobox [data-combobox-part="popup"]:popover-open,
      aihio-combobox [data-combobox-part="popup"][data-fallback-open],
      aihio-combobox [data-combobox-part="message"][data-loading]::before {
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

      aihio-combobox[error] [data-combobox-part="input"] {
        border-width: 2px;
        border-color: FieldText;
      }

      aihio-combobox [data-combobox-part="toggle"] {
        color: ButtonText;
      }

      aihio-combobox [data-combobox-part="toggle"]:disabled {
        color: GrayText;
        opacity: 1;
      }

      aihio-combobox [data-combobox-part="popup"] {
        border-color: CanvasText;
      }

      /* Opt the highlighted option out of adjustment: otherwise the UA draws
         a Canvas backplate behind its text, and HighlightText on Canvas is
         invisible. The colours are stated explicitly instead. */
      aihio-combobox [role="option"][data-active] {
        forced-color-adjust: none;
        background-color: Highlight;
        color: HighlightText;
      }

      aihio-combobox [role="option"][aria-disabled="true"] {
        color: GrayText;
        opacity: 1;
      }
    }
  `,
};
