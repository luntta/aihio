// The seam between components and the schema-backed dev warnings.
//
// AihioElement calls into here on every lifecycle step, but nothing is
// installed by default. The development entry (src/aihio.dev.js) imports
// src/schema/dev-warnings.js, which registers the real implementation; the
// production entry never imports it, so the warning machinery is absent from
// dist/aihio.js by module graph rather than by bundler dead-code elimination.
//
// That distinction matters: the previous design branched on a compile-time
// flag, esbuild kept both sides, and the "dev build" was shipped switched off
// with no way for a consumer to reach it.

let hook = null;

/** Register the dev-warning implementation. Called by dev-warnings.js. */
export function setDevHook(fn) {
  hook = typeof fn === 'function' ? fn : null;
}

/** True when a dev-warning implementation is installed. */
export function hasDevHook() {
  return hook !== null;
}

/**
 * Notify the installed hook, if any.
 *
 * @param {string} phase - 'connect' | 'refresh' | 'disconnect'
 */
export function runDevHook(element, phase) {
  hook?.(element, phase);
}
