// Light-DOM styles for aihio-card.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-card': `
    aihio-card {
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-intent-surface);
      background-color: oklch(var(--color-intent-surface-bg));
      color: oklch(var(--color-intent-surface-fg));
      border: 1px solid oklch(var(--color-intent-border-subtle));
      box-shadow: var(--shadow-intent-surface);
    }

    aihio-card[variant="outline"] {
      box-shadow: none;
    }

    aihio-card-header {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-intent-stack-tight);
      padding: var(--card-padding);
      padding-bottom: 0;
    }

    aihio-card-title {
      display: block;
      font-size: var(--fontSize-intent-heading);
      font-weight: var(--fontWeight-intent-heading);
      line-height: var(--lineHeight-intent-compact);
      letter-spacing: var(--letterSpacing-intent-heading);
    }

    aihio-card-description {
      display: block;
      font-size: var(--fontSize-intent-body-sm);
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    aihio-card-content {
      display: block;
      padding: var(--card-padding);
    }

    aihio-card-footer {
      display: flex;
      /* Footers hold action rows. Unwrapped, a second button pushed straight
         through the card edge on narrow viewports. */
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-intent-control-gap);
      padding: var(--card-padding);
      padding-top: 0;
    }

    @media (forced-colors: active) {
      aihio-card {
        border-color: CanvasText;
      }
    }
  `,
};
