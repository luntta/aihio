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
      gap: var(--spacing-intent-cluster-gap-tight);
      border-radius: var(--radius-intent-interactive);
      background-color: oklch(var(--color-intent-surface-muted-bg));
      padding: var(--spacing-intent-cluster-gap-tight);
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
      border-radius: var(--radius-intent-interactive-compact);
      padding: var(--spacing-intent-stack-tight) var(--spacing-intent-field-padding-inline);
      font-size: var(--fontSize-intent-control);
      font-weight: var(--fontWeight-intent-control);
      color: oklch(var(--color-intent-surface-muted-fg));
      cursor: pointer;
      user-select: none;
      transition: background-color var(--duration-intent-feedback) ease,
                  color var(--duration-intent-feedback) ease,
                  box-shadow var(--duration-intent-feedback) ease;
    }

    aihio-tab:hover:not([disabled]) {
      color: oklch(var(--color-intent-page-fg));
    }

    aihio-tab[active] {
      background-color: oklch(var(--color-intent-page-bg));
      color: oklch(var(--color-intent-page-fg));
      box-shadow: var(--shadow-intent-surface);
    }

    aihio-tab[disabled] {
      pointer-events: none;
      opacity: 0.5;
    }

    aihio-tab:focus-visible {
      outline: 2px solid oklch(var(--color-intent-focus-ring));
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
      padding-top: var(--spacing-intent-stack-sm);
    }
    aihio-tab-panel[active] {
      display: block;
    }
  `,
};
