import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';

import * as esbuild from 'esbuild';

const componentNames = [
  'alert',
  'avatar',
  'badge',
  'button',
  'card',
  'cluster',
  'combobox',
  'data-grid',
  'dialog',
  'dropdown',
  'field',
  'grid',
  'input',
  'pagination',
  'stack',
  'switch',
  'table',
  'tabs',
  'toggle',
];

function runNodeScript(script) {
  execFileSync('node', [script], { stdio: 'inherit' });
}

runNodeScript('src/tokens/build.js');

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
runNodeScript('src/schema/build.js');
runNodeScript('src/css/build.js');

// Production bundle. The schema-backed warning module is not in this entry's
// module graph at all, so it cannot be shipped switched off by accident.
await esbuild.build({
  entryPoints: [
    { in: 'src/aihio.js', out: 'aihio' },
    { in: 'src/components/index.js', out: 'components' },
    { in: 'src/lint/index.js', out: 'lint' },
    { in: 'src/schema/runtime.js', out: 'runtime' },
    // The ranking behind the MCP find tool, for the docs site's search.
    { in: 'src/schema/find.js', out: 'find' },
    ...componentNames.map((name) => ({
      in: `src/components/${name}/${name}.js`,
      out: name,
    })),
  ],
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  minify: true,
});

// Development bundle: same components, with the warning module installed.
// Without this the a11y and enum warnings would exist only in src/, which is
// not published — so no consumer of the package could ever reach them.
// Left unminified because its whole purpose is readable diagnostics.
await esbuild.build({
  entryPoints: [
    { in: 'src/aihio.dev.js', out: 'aihio.dev' },
    { in: 'src/components/dev.js', out: 'components.dev' },
  ],
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  minify: false,
});

// The aihio bin, with the MCP server and the linter as its subcommands.
await esbuild.build({
  entryPoints: ['src/cli.js'],
  bundle: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  format: 'esm',
  outfile: 'dist/cli.js',
  platform: 'node',
  minify: true,
});

await esbuild.build({
  entryPoints: ['src/css/base.css'],
  bundle: true,
  outfile: 'dist/aihio.css',
  minify: true,
});

copyFileSync('docs/semantic-tokens.md', 'dist/semantic-tokens.md');
copyFileSync('docs/tokens.json', 'dist/tokens.json');
copyFileSync('src/lint/index.d.ts', 'dist/lint.d.ts');

console.log('build → package, component, lint, CLI, schema runtime, and CSS entrypoints in dist/');
