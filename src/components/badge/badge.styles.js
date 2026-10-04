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
      border-radius: var(--aihio-radius-pill);
      padding: var(--aihio-badge-padding-y) var(--aihio-badge-padding-x);
      font-size: var(--aihio-font-size-badge);
      font-weight: var(--aihio-font-weight-badge);
      line-height: var(--aihio-line-height-compact);
      border: 1px solid transparent;
      white-space: nowrap;
      transition: background-color var(--aihio-duration-feedback) ease,
                  color var(--aihio-duration-feedback) ease;
    }

    aihio-badge:not([variant]),
    aihio-badge[variant="default"] {
      background-color: var(--aihio-color-primary-action-bg);
      color: var(--aihio-color-primary-action-fg);
    }

    aihio-badge[variant="secondary"] {
      background-color: var(--aihio-color-secondary-action-bg);
      color: var(--aihio-color-secondary-action-fg);
    }

    aihio-badge[variant="outline"] {
      background-color: transparent;
      color: var(--aihio-color-page-fg);
      border-color: var(--aihio-color-border-subtle);
    }

    aihio-badge[variant="destructive"] {
      background-color: var(--aihio-color-destructive-bg);
      color: var(--aihio-color-destructive-fg);
    }

    aihio-badge[variant="success"] {
      background-color: var(--aihio-color-success-bg);
      color: var(--aihio-color-success-fg);
    }

    aihio-badge[variant="warning"] {
      background-color: var(--aihio-color-warning-bg);
      color: var(--aihio-color-warning-fg);
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
