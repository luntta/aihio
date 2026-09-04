import { test, expect } from '@playwright/test';

for (const framework of ['react', 'vue', 'svelte']) {
  test(`${framework} sets properties and receives native input events`, async ({ page }) => {
    await page.goto(`/test/frameworks/framework.html?framework=${framework}`);
    await expect(page.locator('body')).toHaveAttribute('data-status', 'ready');
    await expect(page.locator('#framework-input')).toHaveJSProperty('value', 'updated');

    await page.locator('#framework-input').evaluate((host) => {
      host.control.value = 'typed';
      host.control.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });

    await expect(page.locator('body')).toHaveAttribute('data-event-value', 'typed');
    await expect(page.locator('#framework-input')).toHaveJSProperty('value', 'typed');

    await expect(page.locator('#framework-button > button')).toHaveText('Updated action');
    await page.locator('#framework-button > button').click();
    await expect(page.locator('body')).toHaveAttribute('data-clicked', 'true');
  });
}
