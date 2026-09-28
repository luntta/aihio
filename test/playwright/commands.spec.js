import { test, expect } from '@playwright/test';

async function renderPattern(page, id) {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate(async (root, patternId) => {
    const schema = await fetch('/dist/schema.json').then((response) => response.json());
    root.innerHTML = schema.patterns.find((pattern) => pattern.id === patternId).markup;
    await customElements.whenDefined('aihio-dialog');
  }, id);
}

function recordCloseReasons(page, selector) {
  return page.locator(selector).evaluate((dialog) => {
    globalThis.closeReasons = [];
    dialog.addEventListener('aihio-close', (event) => globalThis.closeReasons.push(event.detail.reason));
  });
}

test('the destructive confirmation pattern opens and cancels with no script', async ({ page }) => {
  await renderPattern(page, 'destructive-confirmation');
  const dialog = page.locator('#delete-project');
  const trigger = page.locator('aihio-button[command="--open"] > button');
  await recordCloseReasons(page, '#delete-project');

  await trigger.click();
  await expect(dialog).toHaveAttribute('open', '');
  expect(await dialog.evaluate((host) => host.shadowRoot.querySelector('dialog').matches(':modal'))).toBe(true);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => globalThis.closeReasons)).toEqual(['command']);
});

test('--toggle opens and closes, and aihio-before-close can refuse a command', async ({ page }) => {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate((root) => {
    root.innerHTML = `
      <button id="toggle" commandfor="panel" command="--toggle">Toggle</button>
      <aihio-dialog id="panel" aria-label="Panel">
        <button id="inner-toggle" commandfor="panel" command="--toggle">Toggle from inside</button>
      </aihio-dialog>
    `;
  });

  await page.locator('#toggle').click();
  await expect(page.locator('#panel')).toHaveAttribute('open', '');

  await page.locator('#panel').evaluate((dialog) => {
    dialog.addEventListener('aihio-before-close', (event) => event.preventDefault(), { once: true });
  });
  await page.locator('#inner-toggle').click();
  await expect(page.locator('#panel')).toHaveAttribute('open', '');

  await page.locator('#inner-toggle').click();
  await expect(page.locator('#panel')).not.toHaveAttribute('open', '');
});

test('engines without Invoker Commands get the same behaviour from the fallback', async ({ page }) => {
  // Hide the API from the feature test and swallow the browser's own command
  // events, so only the fallback's can reach the dialog.
  await page.addInitScript(() => {
    delete HTMLButtonElement.prototype.commandForElement;
    window.addEventListener('command', (event) => {
      if (typeof CommandEvent === 'function' && event instanceof CommandEvent) {
        event.stopImmediatePropagation();
      }
    }, true);
  });
  await renderPattern(page, 'destructive-confirmation');
  const dialog = page.locator('#delete-project');

  await page.locator('aihio-button[command="--open"] > button').click();
  await expect(dialog).toHaveAttribute('open', '');

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');

  // A click handler that cancels activation cancels the command too.
  await page.locator('aihio-button[command="--open"]').evaluate((host) => {
    host.addEventListener('click', (event) => event.preventDefault());
  });
  await page.locator('aihio-button[command="--open"] > button').click();
  await expect(dialog).not.toHaveAttribute('open', '');
});
