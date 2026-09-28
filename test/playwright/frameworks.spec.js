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

  test(`${framework} owns combobox options while the component renders the list`, async ({ page }) => {
    await page.goto(`/test/frameworks/framework.html?framework=${framework}`);
    await expect(page.locator('body')).toHaveAttribute('data-status', 'ready');

    const combobox = page.locator('#framework-combobox');
    const input = combobox.locator('[role="combobox"]');
    await expect(combobox).toHaveJSProperty('value', 'banana');
    await expect(input).toHaveValue('Banana');
    await expect(combobox.locator('[data-combobox-part="input"]')).toHaveCount(1);

    await input.click();
    await expect(combobox.locator('[role="option"]:not([hidden])')).toHaveText(['Banana', 'Cherry', 'Date']);
    await combobox.locator('[role="option"]', { hasText: 'Cherry' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-combobox-value', 'cherry');
    await expect(input).toHaveValue('Cherry');
  });
}
