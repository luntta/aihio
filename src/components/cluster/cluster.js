import { AihioElement } from '../base.js';

export class AihioCluster extends AihioElement {
  static tag = 'aihio-cluster';
  static observedAttributes = ['gap', 'align', 'justify', 'grow'];
  static styles = `
    aihio-cluster {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-intent-control-gap);
    }

    aihio-cluster[gap="tight"] { gap: var(--spacing-intent-cluster-gap-tight); }
    aihio-cluster[gap="sm"]    { gap: var(--spacing-intent-control-gap); }
    aihio-cluster[gap="md"]    { gap: var(--spacing-intent-stack-sm); }
    aihio-cluster[gap="lg"]    { gap: var(--spacing-intent-stack-md); }

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
  `;
}
