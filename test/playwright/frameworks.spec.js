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

  test(`${framework} sets a date picker's value and isDateDisabled as properties, and hears aihio-change`, async ({ page }) => {
    await page.goto(`/test/frameworks/framework.html?framework=${framework}`);
    await expect(page.locator('body')).toHaveAttribute('data-status', 'ready');

    const picker = page.locator('#framework-date');
    await expect(picker).toHaveJSProperty('value', '2026-10-14');
    await expect(picker.locator('[data-date-picker-part="input"]')).toHaveValue('10/14/2026');
    expect(await picker.evaluate((element) => typeof element.isDateDisabled)).toBe('function');
    expect(await picker.evaluate((element) => element.hasAttribute('isdatedisabled'))).toBe(false);

    await picker.locator('[data-date-picker-part="toggle"]').click();
    await expect(picker.locator('td[data-date="2026-10-17"]:not([data-outside])'), 'a Saturday').toHaveAttribute('aria-disabled', 'true');
    await picker.locator('td[data-date="2026-10-16"]:not([data-outside])').click();
    await expect(page.locator('body')).toHaveAttribute('data-date-value', '2026-10-16');
    await expect(picker.locator('[data-date-picker-part="input"]')).toHaveValue('10/16/2026');
  });

  test(`${framework} sorts a manual-sort table's rows from state, and its header keeps one button`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/test/frameworks/framework.html?framework=${framework}`);
    await expect(page.locator('body')).toHaveAttribute('data-status', 'ready');

    const table = page.locator('#framework-manual-table');
    const header = table.getByRole('columnheader', { name: 'Fruit name' });
    const rows = () => table.locator('tbody th').allTextContents();

    // The framework rewrote the header's text after the table took it into
    // a button: the new text is in the one button.
    await expect(header.getByRole('button')).toHaveCount(1);
    await expect(header.getByRole('button')).toHaveText('Fruit name');
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(await rows()).toEqual(['Banana', 'Cherry', 'Date']);

    await header.getByRole('button').click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await expect.poll(rows).toEqual(['Date', 'Cherry', 'Banana']);
    await header.getByRole('button').click();
    await expect.poll(rows).toEqual(['Banana', 'Cherry', 'Date']);
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(errors).toEqual([]);
  });

  test(`${framework} renders the rows a data grid asks for, from 100,000, and sorts them`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/test/frameworks/framework.html?framework=${framework}`);
    await expect(page.locator('body')).toHaveAttribute('data-status', 'ready');

    const grid = page.locator('#framework-grid');
    const firstRow = grid.locator('tbody:not([data-grid-part]) tr').first();
    await expect(firstRow).toHaveText('Item 1');
    await expect(firstRow).toHaveAttribute('aria-rowindex', '2');
    await expect(grid.locator('table')).toHaveAttribute('aria-rowcount', '100001');

    // Halfway down, the framework renders the rows there, and each says
    // which row it is.
    await grid.evaluate((element) => { element.scrollTop = element.scrollHeight / 2; });
    await expect.poll(async () => Number(await firstRow.getAttribute('aria-rowindex'))).toBeGreaterThan(40000);
    const [index, text] = await firstRow.evaluate((row) => [Number(row.getAttribute('aria-rowindex')), row.textContent]);
    expect(text).toBe(`Item ${index - 1}`);

    // The keyboard reaches the last row, which the framework renders on the way.
    await grid.getByRole('button', { name: 'Item' }).focus();
    await page.keyboard.press('Control+End');
    await expect.poll(() => page.evaluate(() => document.activeElement.textContent)).toBe('Item 100000');

    // A sort: the framework reorders its rows, the grid asks for the top again.
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Enter');
    await expect(grid.getByRole('columnheader', { name: 'Item' })).toHaveAttribute('aria-sort', 'descending');
    await expect(firstRow).toHaveText('Item 100000');
    expect(errors).toEqual([]);
  });

  test(`${framework} keeps adding and removing rows in a table that sorts them itself`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/test/frameworks/framework.html?framework=${framework}`);
    await expect(page.locator('body')).toHaveAttribute('data-status', 'ready');

    const table = page.locator('#framework-auto-table');
    const rows = () => table.locator('tbody th').allTextContents();
    const sort = table.getByRole('button', { name: 'Item' });
    expect(await rows()).toEqual(['Fig', 'Banana', 'Cherry']);

    await sort.click();
    await sort.click();
    expect(await rows()).toEqual(['Fig', 'Cherry', 'Banana']);

    // The framework appends; the table puts the new row in its place.
    await page.locator('#framework-add-item').click();
    await expect.poll(rows).toEqual(['Grape', 'Fig', 'Cherry', 'Banana']);
    // And the framework can still find its rows wherever they have moved.
    await page.locator('#framework-remove-item').click();
    await expect.poll(rows).toEqual(['Grape', 'Fig', 'Banana']);
    await sort.click();
    expect(await rows()).toEqual(['Banana', 'Fig', 'Grape']);
    expect(errors).toEqual([]);
  });
}
