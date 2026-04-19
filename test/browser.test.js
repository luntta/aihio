import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browserPage = pathToFileURL(resolve(import.meta.dirname, 'browser/index.html')).href;
const devWarningsPage = pathToFileURL(resolve(import.meta.dirname, 'browser/dev-warnings.html')).href;
const chromiumCandidates = [
  process.env.AIHIO_CHROMIUM_BIN,
  'chromium',
  'chromium-browser',
  'google-chrome',
  'google-chrome-stable',
].filter(Boolean);

function resolveChromium() {
  for (const candidate of chromiumCandidates) {
    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (!result.error && result.status === 0) {
      return candidate;
    }
  }

  return null;
}

const chromiumBin = resolveChromium();

function hasChromium() {
  return Boolean(chromiumBin);
}

function runBrowserPage(page) {
  const baseArgs = [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
    '--virtual-time-budget=20000',
    '--dump-dom',
    page,
  ];
  const result = runChromium(baseArgs);
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  assert.equal(result.status, 0, stderr || stdout);
  assert.match(stdout, /data-status="pass"/, stdout || stderr);
}

function runChromium(args) {
  const initial = spawnSync(chromiumBin, args, { encoding: 'utf8' });
  if (!needsSandboxRetry(initial)) {
    return initial;
  }

  return spawnSync(chromiumBin, ['--no-sandbox', ...args], { encoding: 'utf8' });
}

function needsSandboxRetry(result) {
  const stderr = `${result.stderr ?? ''}\n${result.error?.message ?? ''}`;
  return /no usable sandbox|running as root without --no-sandbox|failed to move to new namespace|operation not permitted/i.test(stderr);
}

test('browser interactions pass in the built package', { skip: !hasChromium() }, () => {
  runBrowserPage(browserPage);
});

test('dev warning checks pass in the browser', { skip: !hasChromium() }, () => {
  runBrowserPage(devWarningsPage);
});
