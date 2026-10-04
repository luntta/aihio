// Light-DOM styles for aihio-alert.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-alert': `
    aihio-alert {
      display: flex;
      /* Title and description are stacked blocks, not columns. Without an
         explicit direction the default "row" set them side by side and
         squeezed both into half the callout. */
      flex-direction: column;
      gap: var(--aihio-spacing-cluster-gap-tight);
      width: 100%;
      border-radius: var(--aihio-radius-surface);
      border: 1px solid var(--aihio-color-border-subtle);
      padding: var(--aihio-spacing-stack-md);
      font-size: var(--aihio-font-size-body-sm);
      line-height: var(--aihio-line-height-body);
    }

    aihio-alert:not([variant]),
    aihio-alert[variant="default"] {
      background-color: var(--aihio-color-surface-bg);
      color: var(--aihio-color-surface-fg);
    }

    aihio-alert[variant="destructive"] {
      border-color: color-mix(in oklch, var(--aihio-color-destructive-bg) 50%, transparent);
      color: var(--aihio-color-destructive-text);
    }
    aihio-alert[variant="destructive"] [slot="title"] {
      color: var(--aihio-color-destructive-text);
    }

    aihio-alert[variant="success"] {
      border-color: color-mix(in oklch, var(--aihio-color-success-bg) 50%, transparent);
      color: var(--aihio-color-success-text);
    }
    aihio-alert[variant="success"] [slot="title"] {
      color: var(--aihio-color-success-text);
    }

    aihio-alert[variant="warning"] {
      border-color: color-mix(in oklch, var(--aihio-color-warning-bg) 50%, transparent);
      color: var(--aihio-color-warning-text);
    }
    aihio-alert[variant="warning"] [slot="title"] {
      color: var(--aihio-color-warning-text);
    }

    aihio-alert [slot="title"] {
      font-weight: var(--aihio-font-weight-control);
      line-height: var(--aihio-line-height-compact);
      letter-spacing: var(--aihio-letter-spacing-heading);
    }

    /* No opacity to set the description back from the title: the contrast
       contract holds the state text colours to 4.5:1 exactly as they are, and
       the success green at 0.9 opacity measured 4.31:1. The title's weight
       carries the hierarchy instead. */
    aihio-alert [slot="description"] {
      font-size: var(--aihio-font-size-body-sm);
    }

    /* Variant colour is discarded under forced colours. The border keeps the
       callout visible as a region; the a11yContract already requires title or
       description text, which is what carries the meaning here. */
    @media (forced-colors: active) {
      aihio-alert {
        border-color: CanvasText;
      }
    }
  `,
};
