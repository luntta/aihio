// Light-DOM styles for aihio-stack.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-stack': `
    aihio-stack {
      display: flex;
      flex-direction: column;
      gap: var(--aihio-spacing-stack-md);
    }

    aihio-stack[gap="tight"] { gap: var(--aihio-spacing-stack-tight); }
    aihio-stack[gap="sm"]    { gap: var(--aihio-spacing-stack-sm); }
    aihio-stack[gap="md"]    { gap: var(--aihio-spacing-stack-md); }
    aihio-stack[gap="lg"]    { gap: var(--aihio-spacing-stack-lg); }

    aihio-stack[align="start"]   { align-items: flex-start; }
    aihio-stack[align="center"]  { align-items: center; }
    aihio-stack[align="end"]     { align-items: flex-end; }
    aihio-stack[align="stretch"] { align-items: stretch; }
  `,
};
