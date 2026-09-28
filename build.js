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
  'dialog',
  'dropdown',
  'field',
  'input',
  'stack',
  'switch',
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

await esbuild.build({
  entryPoints: ['src/lint/cli.js'],
  bundle: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  format: 'esm',
  outfile: 'dist/aihio-lint.js',
  platform: 'node',
  minify: true,
});

await esbuild.build({
  entryPoints: ['src/mcp/cli.js'],
  bundle: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  format: 'esm',
  outfile: 'dist/aihio-mcp.js',
  platform: 'node',
  minify: true,
});

await esbuild.build({
  entryPoints: ['src/css/base.css'],
  bundle: true,
  outfile: 'dist/aihio.css',
  minify: true,
});

copyFileSync('docs/intent-tokens.md', 'dist/intent-tokens.md');
copyFileSync('src/lint/index.d.ts', 'dist/lint.d.ts');

console.log('build → package, component, lint, MCP, schema runtime, and CSS entrypoints in dist/');
