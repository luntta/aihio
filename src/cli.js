// The package's one bin: `aihio mcp` starts the MCP server over stdio, and
// `aihio lint` checks markup against the schema. build.js bundles this into
// dist/cli.js; npx picks it for `npx @luntta/aihio` because its name is the
// package name without the scope.

import process from 'node:process';
import { runCli as runLint } from './lint/cli.js';
import { runServer } from './mcp/server.js';

const USAGE = `Usage: aihio <command>

Commands:
  mcp            Start the MCP server over stdio
  lint [file|-]  Lint markup from a file, or from stdin with '-'
`;

const [command, ...args] = process.argv.slice(2);

if (command === 'mcp') {
  runServer();
} else if (command === 'lint') {
  process.exitCode = runLint({ argv: args });
} else if (command === 'help' || command === '--help' || command === '-h') {
  process.stdout.write(USAGE);
} else {
  process.stderr.write(command ? `Unknown command: ${command}\n\n${USAGE}` : USAGE);
  process.exitCode = 1;
}
