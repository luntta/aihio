// Light-DOM styles for the aihio-dialog subcomponents: header, title,
// description, and footer.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-dialog-header': `
    aihio-dialog-header {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-intent-stack-tight);
      margin-bottom: var(--spacing-intent-stack-md);
    }
  `,
  'aihio-dialog-title': `
    aihio-dialog-title {
      display: block;
      font-size: var(--fontSize-intent-heading-sm);
      font-weight: var(--fontWeight-intent-heading);
      line-height: var(--lineHeight-intent-compact);
      letter-spacing: var(--letterSpacing-intent-heading);
    }
  `,
  'aihio-dialog-description': `
    aihio-dialog-description {
      display: block;
      font-size: var(--fontSize-intent-body-sm);
      color: oklch(var(--color-intent-surface-muted-fg));
    }
  `,
  'aihio-dialog-footer': `
    aihio-dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-intent-control-gap);
      margin-top: var(--spacing-intent-stack-lg);
    }
  `,
};
