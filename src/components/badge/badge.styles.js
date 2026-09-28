// Light-DOM styles for aihio-badge.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-badge': `
    aihio-badge {
      display: inline-flex;
      align-items: center;
      border-radius: var(--radius-intent-pill);
      padding: var(--badge-padding-y) var(--badge-padding-x);
      font-size: var(--fontSize-intent-badge);
      font-weight: var(--fontWeight-intent-badge);
      line-height: var(--lineHeight-intent-compact);
      border: 1px solid transparent;
      white-space: nowrap;
      transition: background-color var(--duration-intent-feedback) ease,
                  color var(--duration-intent-feedback) ease;
    }

    aihio-badge:not([variant]),
    aihio-badge[variant="default"] {
      background-color: oklch(var(--color-intent-action-primary-bg));
      color: oklch(var(--color-intent-action-primary-fg));
    }

    aihio-badge[variant="secondary"] {
      background-color: oklch(var(--color-intent-action-secondary-bg));
      color: oklch(var(--color-intent-action-secondary-fg));
    }

    aihio-badge[variant="outline"] {
      background-color: transparent;
      color: oklch(var(--color-intent-page-fg));
      border-color: oklch(var(--color-intent-border-subtle));
    }

    aihio-badge[variant="destructive"] {
      background-color: oklch(var(--color-intent-state-destructive-bg));
      color: oklch(var(--color-intent-state-destructive-fg));
    }

    aihio-badge[variant="success"] {
      background-color: oklch(var(--color-intent-state-success-bg));
      color: oklch(var(--color-intent-state-success-fg));
    }

    aihio-badge[variant="warning"] {
      background-color: oklch(var(--color-intent-state-warning-bg));
      color: oklch(var(--color-intent-state-warning-fg));
    }

    /* Every variant collapses to the same fill under forced colours, so give
       the chip an outline to keep it readable as a distinct object. */
    @media (forced-colors: active) {
      aihio-badge {
        border-color: CanvasText;
      }
    }
  `,
};
