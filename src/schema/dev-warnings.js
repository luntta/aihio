// Schema-backed development warnings.
//
// Importing this module has no effect; call installDevWarnings() to switch it
// on. The development bundle (dist/aihio.dev.js) does exactly that. Consumers
// running from source can call it themselves at any point — the warnings apply
// from the next lifecycle step onward, so it does not matter whether it runs
// before or after components are imported.

import { setDevHook } from '../components/dev-hook.js';
import { findCommandProblem } from './command-rules.js';
import { collectDevWarnings, describe, formatDevWarning } from './runtime.js';

// Per-element bookkeeping lives here rather than on AihioElement, so the
// production build carries no trace of it.
const activeWarnings = new WeakMap();
const observers = new WeakMap();

const OBSERVED_ATTRIBUTES = [
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'id',
];

let installed = false;

/**
 * Turn on schema and a11yContract warnings for every connected Aihio element.
 * Idempotent.
 */
export function installDevWarnings() {
  if (installed) return;
  installed = true;
  setDevHook(handleLifecycle);
  globalThis.document?.addEventListener('click', checkInvokedCommand, true);
}

/** Turn warnings back off and release all per-element state. */
export function uninstallDevWarnings() {
  if (!installed) return;
  installed = false;
  setDevHook(null);
  globalThis.document?.removeEventListener('click', checkInvokedCommand, true);
}

function handleLifecycle(element, phase) {
  if (phase === 'disconnect') {
    stopObserving(element);
    activeWarnings.delete(element);
    return;
  }

  if (phase === 'connect') {
    startObserving(element);
  }

  reportWarnings(element);
}

// A command is checked when it is invoked rather than when its button
// connects: the dialog it names is often further down the page, not yet parsed
// at that point, and a warning then would be a false alarm.
function checkInvokedCommand(event) {
  const source = event.composedPath().find(
    (node) => node?.localName === 'button' && (node.hasAttribute('commandfor') || node.hasAttribute('command'))
  );
  if (!source) return;

  const commandFor = source.getAttribute('commandfor');
  const target = commandFor ? source.getRootNode().getElementById?.(commandFor) ?? null : null;
  const problem = findCommandProblem({
    sourceTag: 'button',
    command: source.getAttribute('command'),
    commandFor,
    targetTag: target?.localName ?? null,
    acceptedCommands: describe(target)?.commands ?? [],
  });
  if (!problem) return;

  const reporter = source.closest('aihio-button') ?? source;
  console.warn(formatDevWarning(reporter, problem));
}

function reportWarnings(element) {
  const warnings = collectDevWarnings(element);
  const seen = activeWarnings.get(element) ?? new Set();

  for (const warning of warnings) {
    if (seen.has(warning.key)) continue;
    console.warn(formatDevWarning(element, warning));
  }

  activeWarnings.set(element, new Set(warnings.map((warning) => warning.key)));
}

function startObserving(element) {
  if (observers.has(element) || typeof MutationObserver === 'undefined') return;

  const observer = new MutationObserver(() => reportWarnings(element));
  observer.observe(element, {
    attributes: true,
    attributeFilter: OBSERVED_ATTRIBUTES,
    childList: true,
    characterData: true,
    subtree: true,
  });

  observers.set(element, observer);
}

function stopObserving(element) {
  observers.get(element)?.disconnect();
  observers.delete(element);
}
