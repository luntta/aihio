// Invoker Commands are how markup drives a component without script:
//
//   <aihio-button commandfor="confirm" command="--open">Delete…</aihio-button>
//
// Activating the button dispatches a `command` event at #confirm. Only custom
// (--prefixed) commands reach an element that is not itself a <dialog> or a
// popover — the platform drops built-in ones such as show-modal before firing
// — which is why every Aihio command is a custom one.
//
// Engines without the API get the same event from one document listener, so a
// component has a single code path either way.

const nativeSupport =
  typeof HTMLButtonElement !== 'undefined' &&
  'commandForElement' in HTMLButtonElement.prototype;

let fallbackInstalled = false;

/**
 * Call `handler(command, source)` whenever a command is invoked on `host`.
 */
export function onCommand(host, handler) {
  host.addEventListener('command', (event) => handler(event.command, event.source ?? null));
  if (!nativeSupport) installFallback();
}

function installFallback() {
  if (fallbackInstalled || typeof document === 'undefined') return;
  fallbackInstalled = true;

  // Bubble phase, so a click handler that calls preventDefault() cancels the
  // command exactly as it cancels the button's native activation.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;

    const source = event.composedPath().find(
      (node) => node?.localName === 'button' && node.hasAttribute('commandfor')
    );
    if (!source || source.disabled) return;

    const command = source.getAttribute('command') ?? '';
    if (!command.startsWith('--')) return;

    const target = source.getRootNode().getElementById?.(source.getAttribute('commandfor'));
    if (!target) return;

    const commandEvent = new Event('command', { cancelable: true });
    Object.defineProperties(commandEvent, {
      command: { value: command },
      source: { value: source },
    });
    target.dispatchEvent(commandEvent);
  });
}
