import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browserPage = pathToFileURL(resolve(import.meta.dirname, 'browser/index.html')).href;
const devWarningsPage = pathToFileURL(resolve(import.meta.dirname, 'browser/dev-warnings.html')).href;

function hasChromium() {
  const result = spawnSync('chromium', ['--version'], { encoding: 'utf8' });
  return !result.error && result.status === 0;
}

function runBrowserPage(page) {
  const result = spawnSync(
    'chromium',
    [
      '--headless=new',
      '--disable-gpu',
      '--allow-file-access-from-files',
      '--virtual-time-budget=5000',
      '--dump-dom',
      page,
    ],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /data-status="pass"/, result.stdout);
}

test('browser interactions pass in the built package', { skip: !hasChromium() }, () => {
  runBrowserPage(browserPage);
});

test('dev warning checks pass in the browser', { skip: !hasChromium() }, () => {
  runBrowserPage(devWarningsPage);
});
