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
      color: oklch(var(--color-intent-state-destructive-text));
    }
    aihio-alert[variant="destructive"] [slot="title"] {
      color: oklch(var(--color-intent-state-destructive-text));
    }

    aihio-alert[variant="success"] {
      border-color: oklch(var(--color-intent-state-success-bg) / 0.5);
      color: oklch(var(--color-intent-state-success-text));
    }
    aihio-alert[variant="success"] [slot="title"] {
      color: oklch(var(--color-intent-state-success-text));
    }

    aihio-alert[variant="warning"] {
      border-color: oklch(var(--color-intent-state-warning-bg) / 0.5);
      color: oklch(var(--color-intent-state-warning-text));
    }
    aihio-alert[variant="warning"] [slot="title"] {
      color: oklch(var(--color-intent-state-warning-text));
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

    /* Variant colour is discarded under forced colours. The border keeps the
       callout visible as a region; the a11yContract already requires title or
       description text, which is what carries the meaning here. */
    @media (forced-colors: active) {
      aihio-alert {
        border-color: CanvasText;
      }
    }
  `;

  sync() {
    if (this._authoredRole === undefined) {
      this._authoredRole = this.getAttribute('role');
    }

    if (this._authoredRole !== null) return;

    // role="alert" is an assertive live region: it interrupts whatever the
    // screen reader is saying. That is right for a failure and wrong for a
    // confirmation, so only the destructive variant gets it.
    const assertive = this.attr('variant', 'default') === 'destructive';
    this.setAttribute('role', assertive ? 'alert' : 'status');
  }
}
