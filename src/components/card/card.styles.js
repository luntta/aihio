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
      border-radius: var(--aihio-radius-surface);
      background-color: var(--aihio-color-surface-bg);
      color: var(--aihio-color-surface-fg);
      border: 1px solid var(--aihio-color-border-subtle);
      box-shadow: var(--aihio-shadow-surface);
    }

    aihio-card[variant="outline"] {
      box-shadow: none;
    }

    aihio-card-header {
      display: flex;
      flex-direction: column;
      gap: var(--aihio-spacing-stack-tight);
      padding: var(--aihio-card-padding);
      padding-bottom: 0;
    }

    aihio-card-title {
      display: block;
      font-size: var(--aihio-font-size-heading);
      font-weight: var(--aihio-font-weight-heading);
      line-height: var(--aihio-line-height-compact);
      letter-spacing: var(--aihio-letter-spacing-heading);
    }

    aihio-card-description {
      display: block;
      font-size: var(--aihio-font-size-body-sm);
      color: var(--aihio-color-muted-fg);
    }

    aihio-card-content {
      display: block;
      padding: var(--aihio-card-padding);
    }

    aihio-card-footer {
      display: flex;
      /* Footers hold action rows. Unwrapped, a second button pushed straight
         through the card edge on narrow viewports. */
      flex-wrap: wrap;
      align-items: center;
      gap: var(--aihio-spacing-control-gap);
      padding: var(--aihio-card-padding);
      padding-top: 0;
    }

    @media (forced-colors: active) {
      aihio-card {
        border-color: CanvasText;
      }
    }
  `,
};
