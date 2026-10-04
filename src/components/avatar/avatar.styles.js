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
      width: var(--aihio-avatar-size-md);
      height: var(--aihio-avatar-size-md);
      border-radius: var(--aihio-radius-pill);
      overflow: hidden;
      background-color: var(--aihio-color-muted-bg);
      color: var(--aihio-color-muted-fg);
      font-size: var(--aihio-font-size-control);
      font-weight: var(--aihio-font-weight-control);
      flex-shrink: 0;
    }

    aihio-avatar[size="sm"] {
      width: var(--aihio-avatar-size-sm);
      height: var(--aihio-avatar-size-sm);
      font-size: var(--aihio-font-size-control-sm);
    }
    aihio-avatar[size="lg"] {
      width: var(--aihio-avatar-size-lg);
      height: var(--aihio-avatar-size-lg);
      font-size: var(--aihio-font-size-control-lg);
    }

    aihio-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
};
