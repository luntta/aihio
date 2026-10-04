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
      gap: var(--aihio-spacing-stack-tight);
      margin-bottom: var(--aihio-spacing-stack-md);
    }
  `,
  'aihio-dialog-title': `
    aihio-dialog-title {
      display: block;
      font-size: var(--aihio-font-size-heading-sm);
      font-weight: var(--aihio-font-weight-heading);
      line-height: var(--aihio-line-height-compact);
      letter-spacing: var(--aihio-letter-spacing-heading);
    }
  `,
  'aihio-dialog-description': `
    aihio-dialog-description {
      display: block;
      font-size: var(--aihio-font-size-body-sm);
      color: var(--aihio-color-muted-fg);
    }
  `,
  'aihio-dialog-footer': `
    aihio-dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--aihio-spacing-control-gap);
      margin-top: var(--aihio-spacing-stack-lg);
    }
  `,
};
