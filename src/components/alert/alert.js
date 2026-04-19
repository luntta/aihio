import { AihioElement } from '../base.js';

export class AihioAlert extends AihioElement {
  static tag = 'aihio-alert';
  static observedAttributes = ['variant'];
  static styles = `
    aihio-alert {
      display: flex;
      gap: var(--spacing-intent-stack-sm);
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
      color: oklch(var(--color-intent-state-destructive-bg));
    }
    aihio-alert[variant="destructive"] [slot="title"] {
      color: oklch(var(--color-intent-state-destructive-bg));
    }

    aihio-alert [slot="title"] {
      font-weight: var(--fontWeight-intent-control);
      line-height: var(--lineHeight-intent-compact);
      letter-spacing: -0.01em;
      margin-bottom: var(--spacing-intent-cluster-gap-tight);
    }

    aihio-alert [slot="description"] {
      font-size: var(--fontSize-intent-body-sm);
      opacity: 0.9;
    }
  `;

  constructor() {
    super();
    if (!this.getAttribute('role')) {
      this.setAttribute('role', 'alert');
    }
  }
}
