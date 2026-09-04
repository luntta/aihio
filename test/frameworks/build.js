import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as esbuild from 'esbuild';
import { compile } from 'svelte/compiler';

const root = resolve(import.meta.dirname, '../..');
const outdir = resolve(import.meta.dirname, 'generated');
mkdirSync(outdir, { recursive: true });

await esbuild.build({
  entryPoints: [
    resolve(import.meta.dirname, 'react.js'),
    resolve(import.meta.dirname, 'vue.js'),
  ],
  bundle: true,
  format: 'esm',
  outdir,
  minify: true,
});

const source = readFileSync(resolve(import.meta.dirname, 'svelte.svelte'), 'utf8');
const compiled = compile(source, {
  filename: 'svelte.svelte',
  generate: 'client',
  dev: false,
});
writeFileSync(resolve(outdir, 'svelte-component.js'), compiled.js.code, 'utf8');

await esbuild.build({
  entryPoints: [resolve(import.meta.dirname, 'svelte-entry.js')],
  bundle: true,
  format: 'esm',
  outfile: resolve(outdir, 'svelte.js'),
  minify: true,
});
