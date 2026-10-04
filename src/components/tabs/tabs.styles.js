// Light-DOM styles for aihio-tab-list, aihio-tab, and aihio-tab-panel.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-tab-list': `
    aihio-tab-list {
      display: inline-flex;
      align-items: center;
      gap: var(--aihio-spacing-cluster-gap-tight);
      border-radius: var(--aihio-radius-interactive);
      background-color: var(--aihio-color-muted-bg);
      padding: var(--aihio-spacing-cluster-gap-tight);
    }

    @media (forced-colors: active) {
      aihio-tab-list {
        border: 1px solid CanvasText;
      }
    }
  `,
  'aihio-tab': `
    aihio-tab {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      border-radius: var(--aihio-radius-interactive-compact);
      padding: var(--aihio-spacing-stack-tight) var(--aihio-spacing-field-padding-inline);
      font-size: var(--aihio-font-size-control);
      font-weight: var(--aihio-font-weight-control);
      color: var(--aihio-color-muted-fg);
      cursor: pointer;
      user-select: none;
      transition: background-color var(--aihio-duration-feedback) ease,
                  color var(--aihio-duration-feedback) ease,
                  box-shadow var(--aihio-duration-feedback) ease;
    }

    aihio-tab:hover:not([disabled]) {
      color: var(--aihio-color-page-fg);
    }

    aihio-tab[active] {
      background-color: var(--aihio-color-page-bg);
      color: var(--aihio-color-page-fg);
      box-shadow: var(--aihio-shadow-surface);
    }

    aihio-tab[disabled] {
      pointer-events: none;
      opacity: 0.5;
    }

    aihio-tab:focus-visible {
      outline: 2px solid var(--aihio-color-focus-ring);
      outline-offset: 2px;
    }

    /* The selected tab is marked by a fill and a shadow, both of which forced
       colours discards, leaving no visible selection at all. Highlight is the
       system pair for a selected item. */
    @media (forced-colors: active) {
      aihio-tab {
        color: ButtonText;
      }

      aihio-tab[active] {
        background-color: Highlight;
        color: HighlightText;
      }

      aihio-tab[disabled] {
        color: GrayText;
        opacity: 1;
      }

      aihio-tab:focus-visible {
        outline-color: Highlight;
      }
    }
  `,
  'aihio-tab-panel': `
    aihio-tab-panel {
      display: none;
      padding-top: var(--aihio-spacing-stack-sm);
    }
    aihio-tab-panel[active] {
      display: block;
    }
  `,
};
