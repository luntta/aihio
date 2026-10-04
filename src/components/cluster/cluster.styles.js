// Light-DOM styles for aihio-cluster.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-cluster': `
    aihio-cluster {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--aihio-spacing-control-gap);
    }

    aihio-cluster[gap="tight"] { gap: var(--aihio-spacing-cluster-gap-tight); }
    aihio-cluster[gap="sm"]    { gap: var(--aihio-spacing-control-gap); }
    aihio-cluster[gap="md"]    { gap: var(--aihio-spacing-stack-sm); }
    aihio-cluster[gap="lg"]    { gap: var(--aihio-spacing-stack-md); }

    aihio-cluster[align="start"]    { align-items: flex-start; }
    aihio-cluster[align="center"]   { align-items: center; }
    aihio-cluster[align="end"]      { align-items: flex-end; }
    aihio-cluster[align="baseline"] { align-items: baseline; }

    aihio-cluster[justify="start"]   { justify-content: flex-start; }
    aihio-cluster[justify="center"]  { justify-content: center; }
    aihio-cluster[justify="end"]     { justify-content: flex-end; }
    aihio-cluster[justify="between"] { justify-content: space-between; }

    /* justify only has something to distribute once the cluster occupies its
       row. Inside a flex parent (a card or dialog footer) it is otherwise
       sized to its content and every justify value looks the same. */
    aihio-cluster[grow] {
      flex: 1 1 auto;
      width: 100%;
    }
  `,
};
