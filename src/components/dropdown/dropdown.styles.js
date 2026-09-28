// Light-DOM styles for aihio-dropdown-item and aihio-dropdown-separator.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-dropdown-item': `
    aihio-dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-intent-control-gap);
      padding: var(--spacing-intent-stack-tight) var(--spacing-intent-field-padding-inline-sm);
      border-radius: var(--radius-intent-interactive-compact);
      font-size: var(--fontSize-intent-control);
      cursor: pointer;
      user-select: none;
      outline: none;
      transition: background-color var(--duration-intent-feedback-fast) ease,
                  color var(--duration-intent-feedback-fast) ease;
    }

    /* A link item: the <a> is the menuitem, so it carries the row's padding
       and the whole row is the link's hit area. */
    aihio-dropdown-item:has(> a[href]) {
      padding: 0;
    }

    aihio-dropdown-item > a[href] {
      display: flex;
      flex: 1;
      align-items: center;
      gap: var(--spacing-intent-control-gap);
      padding: var(--spacing-intent-stack-tight) var(--spacing-intent-field-padding-inline-sm);
      border-radius: inherit;
      color: inherit;
      text-decoration: none;
      outline: none;
    }

    /* Not accent: in the dark theme accent matches the overlay surface. */
    aihio-dropdown-item:hover,
    aihio-dropdown-item:focus-visible,
    aihio-dropdown-item:has(> a:focus-visible) {
      background-color: oklch(var(--color-intent-overlay-highlight-bg));
      color: oklch(var(--color-intent-overlay-fg));
    }

    aihio-dropdown-item[disabled] {
      pointer-events: none;
      opacity: 0.5;
    }

    @media (forced-colors: active) {
      /* Opt the highlighted item out of adjustment: otherwise the UA draws a
         Canvas backplate behind its text, and HighlightText on Canvas is
         invisible. The colours are stated explicitly instead. */
      aihio-dropdown-item:hover,
      aihio-dropdown-item:focus,
      aihio-dropdown-item:has(> a:focus) {
        forced-color-adjust: none;
        background-color: Highlight;
        color: HighlightText;
      }

      aihio-dropdown-item[disabled] {
        color: GrayText;
        opacity: 1;
      }
    }
  `,
  'aihio-dropdown-separator': `
    aihio-dropdown-separator {
      display: block;
      height: 1px;
      background-color: oklch(var(--color-intent-border-subtle));
      margin: var(--spacing-intent-cluster-gap-tight) calc(var(--spacing-intent-cluster-gap-tight) * -1);
    }
  `,
};
