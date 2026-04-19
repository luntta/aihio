import { AihioElement } from '../base.js';

export class AihioCard extends AihioElement {
  static tag = 'aihio-card';
  static observedAttributes = ['variant'];
  static styles = `
    aihio-card {
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-intent-surface);
      background-color: oklch(var(--color-intent-surface-bg));
      color: oklch(var(--color-intent-surface-fg));
      border: 1px solid oklch(var(--color-intent-border-subtle));
      box-shadow: var(--shadow-intent-surface);
    }

    aihio-card[variant="outline"] {
      box-shadow: none;
    }

    aihio-card-header {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-intent-stack-tight);
      padding: var(--card-padding);
      padding-bottom: 0;
    }

    aihio-card-title {
      display: block;
      font-size: var(--fontSize-intent-heading);
      font-weight: var(--fontWeight-intent-heading);
      line-height: var(--lineHeight-intent-compact);
      letter-spacing: -0.02em;
    }

    aihio-card-description {
      display: block;
      font-size: var(--fontSize-intent-body-sm);
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    aihio-card-content {
      display: block;
      padding: var(--card-padding);
    }

    aihio-card-footer {
      display: flex;
      align-items: center;
      gap: var(--spacing-intent-control-gap);
      padding: var(--card-padding);
      padding-top: 0;
    }
  `;
}

export class AihioCardHeader extends AihioElement {
  static tag = 'aihio-card-header';
}

export class AihioCardTitle extends AihioElement {
  static tag = 'aihio-card-title';
}

export class AihioCardDescription extends AihioElement {
  static tag = 'aihio-card-description';
}

export class AihioCardContent extends AihioElement {
  static tag = 'aihio-card-content';
}

export class AihioCardFooter extends AihioElement {
  static tag = 'aihio-card-footer';
}
