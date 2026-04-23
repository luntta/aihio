import { execFileSync, spawn } from 'node:child_process';
import { readdirSync, watch } from 'node:fs';
import { join } from 'node:path';

import * as esbuild from 'esbuild';

function runNodeScript(script) {
  execFileSync('node', [script], { stdio: 'inherit' });
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, files);
    } else {
      files.push(path);
    }
  }
  return files;
}

function debounce(task, delay = 100) {
  let timer = null;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(task, delay);
  };
}

runNodeScript('src/tokens/build.js');
runNodeScript('src/schema/build.js');
runNodeScript('src/css/build.js');

const jsCtx = await esbuild.context({
  entryPoints: [
    { in: 'src/aihio.js', out: 'aihio' },
    { in: 'src/components/index.js', out: 'components' },
  ],
  bundle: true,
  define: {
    __AIHIO_DEV__: 'true',
  },
  format: 'esm',
  outdir: 'dist',
  sourcemap: true,
});

const cssCtx = await esbuild.context({
  entryPoints: ['src/css/base.css'],
  bundle: true,
  outfile: 'dist/aihio.css',
  sourcemap: true,
});

await Promise.all([jsCtx.watch(), cssCtx.watch()]);

const rebuildTokens = debounce(() => runNodeScript('src/tokens/build.js'));
const rebuildStyles = debounce(() => runNodeScript('src/css/build.js'));
const rebuildSchema = debounce(() => runNodeScript('src/schema/build.js'));

const watchers = [
  ...['tokens/base.json', 'tokens/semantic.json', 'tokens/intent.json', 'tokens/component.json']
    .map((file) => watch(file, rebuildTokens)),
  ...['package.json']
    .map((file) => watch(file, rebuildSchema)),
  ...walk('patterns')
    .map((file) => watch(file, rebuildSchema)),
  ...walk('src/schema')
    .filter((file) => (
      (file.endsWith('.json') || file.endsWith('.js')) &&
      !file.endsWith('runtime-schema.js')
    ))
    .map((file) => watch(file, rebuildSchema)),
  ...walk('src/components')
    .filter((file) => file.endsWith('.schema.json'))
    .map((file) => watch(file, rebuildSchema)),
  ...walk('src/components')
    .filter((file) => file.endsWith('.js'))
    .map((file) => watch(file, rebuildStyles)),
];

const eleventy = spawn(
  process.execPath,
  ['node_modules/@11ty/eleventy/cmd.cjs', '--serve', '--port=3000'],
  {
    stdio: 'inherit',
  }
);

console.log('dev → http://127.0.0.1:3000/');

function cleanup() {
  watchers.forEach((watcher) => watcher.close());
  eleventy.kill('SIGTERM');
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});
