// Light-DOM styles for aihio-grid.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-grid': `
    /* As many equal columns as fit, never narrower than --aihio-grid-min and
       never more than --aihio-grid-columns. Below the minimum the grid drops a
       column rather than squeezing, so it needs no breakpoints: it responds to
       its own width, not the viewport's. */
    aihio-grid {
      --aihio-grid-min: 16rem;
      --aihio-grid-columns: 12;
      --aihio-grid-gap: var(--aihio-spacing-stack-md);

      display: grid;
      gap: var(--aihio-grid-gap);
      grid-template-columns: repeat(
        auto-fill,
        minmax(
          min(100%, max(
            var(--aihio-grid-min),
            (100% - (var(--aihio-grid-columns) - 1) * var(--aihio-grid-gap)) / var(--aihio-grid-columns)
          )),
          1fr
        )
      );
    }

    aihio-grid[columns="2"] { --aihio-grid-columns: 2; }
    aihio-grid[columns="3"] { --aihio-grid-columns: 3; }
    aihio-grid[columns="4"] { --aihio-grid-columns: 4; }

    aihio-grid[gap="tight"] { --aihio-grid-gap: var(--aihio-spacing-stack-tight); }
    aihio-grid[gap="sm"]    { --aihio-grid-gap: var(--aihio-spacing-stack-sm); }
    aihio-grid[gap="md"]    { --aihio-grid-gap: var(--aihio-spacing-stack-md); }
    aihio-grid[gap="lg"]    { --aihio-grid-gap: var(--aihio-spacing-stack-lg); }
  `,
};
