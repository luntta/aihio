// Light-DOM styles for aihio-avatar.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-avatar': `
    aihio-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--avatar-size-md);
      height: var(--avatar-size-md);
      border-radius: var(--radius-intent-pill);
      overflow: hidden;
      background-color: oklch(var(--color-intent-surface-muted-bg));
      color: oklch(var(--color-intent-surface-muted-fg));
      font-size: var(--fontSize-intent-control);
      font-weight: var(--fontWeight-intent-control);
      flex-shrink: 0;
    }

    aihio-avatar[size="sm"] {
      width: var(--avatar-size-sm);
      height: var(--avatar-size-sm);
      font-size: var(--fontSize-intent-control-sm);
    }
    aihio-avatar[size="lg"] {
      width: var(--avatar-size-lg);
      height: var(--avatar-size-lg);
      font-size: var(--fontSize-intent-control-lg);
    }

    aihio-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
};
