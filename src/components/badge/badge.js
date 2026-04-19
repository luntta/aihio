import { AihioElement } from '../base.js';

export class AihioBadge extends AihioElement {
  static tag = 'aihio-badge';
  static observedAttributes = ['variant'];
  static styles = `
    aihio-badge {
      display: inline-flex;
      align-items: center;
      border-radius: var(--radius-intent-pill);
      padding: var(--badge-padding-y) var(--badge-padding-x);
      font-size: var(--fontSize-intent-badge);
      font-weight: var(--fontWeight-intent-badge);
      line-height: var(--lineHeight-intent-compact);
      border: 1px solid transparent;
      white-space: nowrap;
      transition: background-color var(--duration-intent-feedback) ease,
                  color var(--duration-intent-feedback) ease;
    }

    aihio-badge:not([variant]),
    aihio-badge[variant="default"] {
      background-color: oklch(var(--color-intent-action-primary-bg));
      color: oklch(var(--color-intent-action-primary-fg));
    }

    aihio-badge[variant="secondary"] {
      background-color: oklch(var(--color-intent-action-secondary-bg));
      color: oklch(var(--color-intent-action-secondary-fg));
    }

    aihio-badge[variant="outline"] {
      background-color: transparent;
      color: oklch(var(--color-intent-page-fg));
      border-color: oklch(var(--color-intent-border-subtle));
    }

    aihio-badge[variant="destructive"] {
      background-color: oklch(var(--color-intent-state-destructive-bg));
      color: oklch(var(--color-intent-state-destructive-fg));
    }
  `;
}
