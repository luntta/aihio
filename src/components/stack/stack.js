import { AihioElement } from '../base.js';

export class AihioStack extends AihioElement {
  static tag = 'aihio-stack';
  static schemaVersion = '1.0.0';
  static observedAttributes = ['gap', 'align'];
  static styles = `
    aihio-stack {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-intent-stack-md);
    }

    aihio-stack[gap="tight"] { gap: var(--spacing-intent-stack-tight); }
    aihio-stack[gap="sm"]    { gap: var(--spacing-intent-stack-sm); }
    aihio-stack[gap="md"]    { gap: var(--spacing-intent-stack-md); }
    aihio-stack[gap="lg"]    { gap: var(--spacing-intent-stack-lg); }

    aihio-stack[align="start"]   { align-items: flex-start; }
    aihio-stack[align="center"]  { align-items: center; }
    aihio-stack[align="end"]     { align-items: flex-end; }
    aihio-stack[align="stretch"] { align-items: stretch; }
  `;
}
