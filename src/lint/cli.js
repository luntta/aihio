import { readFileSync } from 'node:fs';
import process from 'node:process';
import { lintMarkup } from './index.js';

export function runCli({
  argv = [],
  readFile = (path) => readFileSync(path, 'utf8'),
  readStdin = () => readFileSync(0, 'utf8'),
  write = (text) => process.stdout.write(text),
} = {}) {
  if (argv.includes('--help') || argv.includes('-h')) {
    write(getUsage());
    return 0;
  }

  const target = argv[0] ?? '-';
  const { markup, source } = readMarkup(target, { readFile, readStdin });
  const result = lintMarkup(markup, { source });

  write(`${JSON.stringify(result, null, 2)}\n`);
  return result.ok ? 0 : 1;
}

function readMarkup(target, { readFile, readStdin }) {
  if (target === '-' || !target) {
    return {
      markup: readStdin(),
      source: '<stdin>',
    };
  }

  return {
    markup: readFile(target),
    source: target,
  };
}

function getUsage() {
  return 'Usage: aihio lint [file|-]\n\nPass a file path or \'-\' to read markup from stdin.\n';
}
