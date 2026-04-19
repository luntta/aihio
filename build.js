import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';

import * as esbuild from 'esbuild';

function runNodeScript(script) {
  execFileSync('node', [script], { stdio: 'inherit' });
}

runNodeScript('src/tokens/build.js');

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
runNodeScript('src/schema/build.js');
runNodeScript('src/css/build.js');

await esbuild.build({
  entryPoints: [
    { in: 'src/aihio.js', out: 'aihio' },
    { in: 'src/components/index.js', out: 'components' },
  ],
  bundle: true,
  define: {
    __AIHIO_DEV__: 'false',
  },
  format: 'esm',
  outdir: 'dist',
  minify: true,
});

await esbuild.build({
  entryPoints: ['src/css/base.css'],
  bundle: true,
  outfile: 'dist/aihio.css',
  minify: true,
});

copyFileSync('docs/intent-tokens.md', 'dist/intent-tokens.md');

console.log('build → dist/aihio.js, dist/components.js, dist/aihio.css');
