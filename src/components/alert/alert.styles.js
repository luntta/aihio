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
      gap: var(--spacing-intent-cluster-gap-tight);
      width: 100%;
      border-radius: var(--radius-intent-surface);
      border: 1px solid oklch(var(--color-intent-border-subtle));
      padding: var(--spacing-intent-stack-md);
      font-size: var(--fontSize-intent-body-sm);
      line-height: var(--lineHeight-intent-body);
    }

    aihio-alert:not([variant]),
    aihio-alert[variant="default"] {
      background-color: oklch(var(--color-intent-surface-bg));
      color: oklch(var(--color-intent-surface-fg));
    }

    aihio-alert[variant="destructive"] {
      border-color: oklch(var(--color-intent-state-destructive-bg) / 0.5);
      color: oklch(var(--color-intent-state-destructive-text));
    }
    aihio-alert[variant="destructive"] [slot="title"] {
      color: oklch(var(--color-intent-state-destructive-text));
    }

    aihio-alert[variant="success"] {
      border-color: oklch(var(--color-intent-state-success-bg) / 0.5);
      color: oklch(var(--color-intent-state-success-text));
    }
    aihio-alert[variant="success"] [slot="title"] {
      color: oklch(var(--color-intent-state-success-text));
    }

    aihio-alert[variant="warning"] {
      border-color: oklch(var(--color-intent-state-warning-bg) / 0.5);
      color: oklch(var(--color-intent-state-warning-text));
    }
    aihio-alert[variant="warning"] [slot="title"] {
      color: oklch(var(--color-intent-state-warning-text));
    }

    aihio-alert [slot="title"] {
      font-weight: var(--fontWeight-intent-control);
      line-height: var(--lineHeight-intent-compact);
      letter-spacing: var(--letterSpacing-intent-heading);
    }

    /* No opacity to set the description back from the title: the contrast
       contract holds the state text colours to 4.5:1 exactly as they are, and
       the success green at 0.9 opacity measured 4.31:1. The title's weight
       carries the hierarchy instead. */
    aihio-alert [slot="description"] {
      font-size: var(--fontSize-intent-body-sm);
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
