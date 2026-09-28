// The one verdict on an Invoker Command, shared by the linter (over parsed
// markup) and the dev warnings (over live DOM at the moment of activation).
//
// A command that goes nowhere fails silently: the button renders, activates,
// and nothing happens. That makes it the easiest mistake to ship, and the most
// common one is reaching for show-modal, which only a native <dialog> answers —
// aihio-dialog keeps its <dialog> in a shadow root.

const COMMAND_SOURCES = new Set(['button', 'aihio-button']);

/**
 * @param {object} command
 * @param {string} command.sourceTag - tag of the element carrying the attributes
 * @param {string|null} command.command
 * @param {string|null} command.commandFor
 * @param {string|null} command.targetTag - tag of the element commandfor names, or null when none matches
 * @param {string[]} command.acceptedCommands - commands the target's schema declares
 * @returns {{ severity: 'error' | 'warn', message: string } | null}
 */
export function findCommandProblem({ sourceTag, command, commandFor, targetTag, acceptedCommands }) {
  if (commandFor === null && command === null) return null;

  const error = (message) => ({ severity: 'error', message });

  if (!COMMAND_SOURCES.has(sourceTag)) {
    return error(`command and commandfor only work on <button> or <aihio-button>, not <${sourceTag}>.`);
  }
  if (commandFor === null) {
    return error(`command="${command}" does nothing without commandfor naming the element that receives it.`);
  }
  if (!command) {
    return error(`commandfor="${commandFor}" does nothing without a command.`);
  }
  if (targetTag === null) {
    return { severity: 'warn', message: `commandfor="${commandFor}" does not match any element id.` };
  }

  // A native target follows the platform's own rules; only Aihio components
  // declare their commands in the schema.
  if (!targetTag.startsWith('aihio-')) return null;
  if (acceptedCommands.includes(command)) return null;

  if (acceptedCommands.length === 0) {
    return error(`<${targetTag}> does not respond to commands.`);
  }

  const expected = `Use one of: ${acceptedCommands.join(', ')}.`;
  if (!command.startsWith('--')) {
    return error(`<${targetTag}> does not respond to the built-in command "${command}"; built-in commands only reach a native <dialog> or popover. ${expected}`);
  }
  return error(`<${targetTag}> has no command "${command}". ${expected}`);
}
