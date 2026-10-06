import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mount(page, markup, { theme = null } = {}) {
  await page.goto('/test/playwright/fixture.html');
  await page.evaluate(() => customElements.whenDefined('aihio-pagination'));
  await page.locator('#fixture').evaluate((root, { html, theme }) => {
    if (theme) {
      document.documentElement.dataset.theme = theme;
      getComputedStyle(document.documentElement).color;
    }
    root.innerHTML = html;
  }, { html: markup, theme });
}

/** What the list shows, in order: page numbers, … for a gap, and ‹ › for previous and next. */
function items(page, id = 'pages') {
  return page.locator(`#${id} li`).evaluateAll((entries) => entries.map((entry) => {
    const control = entry.firstElementChild;
    const part = control.dataset.paginationPart;
    if (part === 'previous') return '‹';
    if (part === 'next') return '›';
    if (part === 'gap') return '…';
    return control.getAttribute('aria-current') === 'page' ? `[${control.textContent}]` : control.textContent;
  }).join(' '));
}

test('a navigation landmark of page links, the current page marked, always seven long', async ({ page }) => {
  await mount(page, '<aihio-pagination id="pages" page="57" pages="4000" href="/requests?page={page}"></aihio-pagination>');
  const nav = page.getByRole('navigation', { name: 'Pagination' });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('list')).toHaveCount(1);
  expect(await items(page)).toBe('‹ 1 … 56 [57] 58 … 4000 ›');

  const current = nav.getByRole('link', { name: 'Page 57' });
  await expect(current).toHaveAttribute('aria-current', 'page');
  await expect(current).toHaveAttribute('href', '/requests?page=57');
  await expect(nav.getByRole('link', { name: 'Previous' })).toHaveAttribute('rel', 'prev');
  await expect(nav.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/requests?page=58');
  // The gaps are for the eye; the page names say what is skipped.
  await expect(page.locator('#pages li[aria-hidden="true"]')).toHaveCount(2);

  for (const [current, expected] of [
    [1, '‹ [1] 2 3 4 5 … 4000 ›'],
    [4, '‹ 1 2 3 [4] 5 … 4000 ›'],
    [3997, '‹ 1 … 3996 [3997] 3998 3999 4000 ›'],
    [4000, '‹ 1 … 3996 3997 3998 3999 [4000] ›'],
  ]) {
    await page.locator('#pages').evaluate((host, value) => { host.page = value; }, current);
    expect(await items(page)).toBe(expected);
  }
});

test('at the ends previous and next stay in place, disabled and out of the tab order', async ({ page }) => {
  await mount(page, `
    <aihio-pagination id="pages" page="1" pages="3" href="#page-{page}" aria-label="Invoice pages"></aihio-pagination>
    <button id="after">After</button>
  `);
  const previous = page.locator('#pages [data-pagination-part="previous"]');
  await expect(previous).toHaveAttribute('role', 'link');
  await expect(previous).toHaveAttribute('aria-disabled', 'true');
  await expect(previous).not.toHaveAttribute('href');

  await page.locator('#background').focus();
  const stops = [];
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate(() => document.activeElement.getAttribute('aria-label') ?? document.activeElement.textContent.trim()));
  }
  expect(stops).toEqual(['Page 1', 'Page 2', 'Page 3', 'Next', 'After']);
});

test('fewer than two pages show nothing, and are no landmark', async ({ page }) => {
  await mount(page, '<aihio-pagination id="pages" page="1" pages="1"></aihio-pagination>');
  await expect(page.locator('#pages')).toBeHidden();
  await expect(page.getByRole('navigation')).toHaveCount(0);

  await page.locator('#pages').evaluate((host) => { host.pages = 3; });
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toBeVisible();
});

test('a link opens its page, unless aihio-page is cancelled; a new-tab click is left alone', async ({ page }) => {
  await mount(page, '<aihio-pagination id="pages" page="2" pages="5" href="#page-{page}"></aihio-pagination>');
  await page.locator('#pages').evaluate((host) => {
    window.picked = [];
    host.addEventListener('aihio-page', (event) => {
      window.picked.push(event.detail.page);
      if (event.detail.page === 4) event.preventDefault();
    });
  });

  await page.getByRole('link', { name: 'Page 3' }).click();
  await expect(page).toHaveURL(/#page-3$/);
  // A link navigates; it does not set page itself.
  await expect(page.locator('#pages')).toHaveAttribute('page', '2');

  await page.getByRole('link', { name: 'Page 4' }).click();
  await expect(page).toHaveURL(/#page-3$/);

  await page.getByRole('link', { name: 'Next' }).click({ modifiers: ['Shift'] }).catch(() => {});
  expect(await page.evaluate(() => window.picked)).toEqual([3, 4]);
});

test('a button shows its page, announces it, and keeps focus on the control used', async ({ page }) => {
  await mount(page, '<aihio-pagination id="pages" page="1" pages="3" page-text="Sivu {page}" next-text="Seuraava" previous-text="Edellinen"></aihio-pagination>');
  const host = page.locator('#pages');
  const status = page.locator('#pages [role="status"]');

  const next = host.getByRole('button', { name: 'Seuraava' });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(host).toHaveAttribute('page', '2');
  await expect(host.getByRole('button', { name: 'Sivu 2' })).toHaveAttribute('aria-current', 'page');
  await expect(next).toBeFocused();
  await expect(status).toHaveText('Sivu 2');

  // On the last page Next is disabled, so focus goes to the current page.
  await page.keyboard.press('Enter');
  await expect(host).toHaveAttribute('page', '3');
  await expect(next).toBeDisabled();
  await expect(host.getByRole('button', { name: 'Sivu 3' })).toBeFocused();

  // Cancelling aihio-page leaves the page to your code.
  await host.evaluate((element) => element.addEventListener('aihio-page', (event) => event.preventDefault()));
  await host.getByRole('button', { name: 'Sivu 1' }).click();
  await expect(host).toHaveAttribute('page', '3');
});

test('an author\'s label replaces the default, and the label follows it', async ({ page }) => {
  await mount(page, `
    <h2 id="heading">Payments</h2>
    <aihio-pagination id="named" pages="4" aria-label="Invoice pages"></aihio-pagination>
    <aihio-pagination id="labelled" pages="4" aria-labelledby="heading"></aihio-pagination>
    <aihio-pagination id="default" pages="4"></aihio-pagination>
  `);
  await expect(page.getByRole('navigation', { name: 'Invoice pages' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Payments' })).toBeVisible();
  await expect(page.locator('#labelled')).not.toHaveAttribute('aria-label');

  await page.locator('#default').evaluate((host) => host.setAttribute('aria-label', 'Result pages'));
  await expect(page.getByRole('navigation', { name: 'Result pages' })).toBeVisible();
  await page.locator('#default').evaluate((host) => host.removeAttribute('aria-label'));
  await expect(page.locator('#default')).toHaveAttribute('aria-label', 'Pagination');
});

test('on a phone the list keeps five slots on one line, and previous and next keep their names', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await mount(page, '<aihio-pagination id="pages" page="3997" pages="4000" href="#page-{page}"></aihio-pagination>');
  expect(await items(page)).toBe('‹ 1 … [3997] … 4000 ›');
  await expect(page.getByRole('link', { name: 'Previous' })).toBeVisible();

  const tops = await page.locator('#pages li').evaluateAll((entries) => new Set(entries.map((entry) => Math.round(entry.getBoundingClientRect().top))).size);
  expect(tops).toBe(1);

  await page.setViewportSize({ width: 1000, height: 700 });
  await expect.poll(() => items(page)).toBe('‹ 1 … 3996 [3997] 3998 3999 4000 ›');
});

test('in a narrow column on a wide screen it draws compact, and full again once there is room', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 700 });
  await mount(page, `
    <div id="column" style="width: 18rem">
      <aihio-pagination id="pages" page="57" pages="4000" href="#page-{page}"></aihio-pagination>
    </div>
    <div id="row" style="width: 24rem">
      <aihio-cluster justify="between">
        <p>Showing 1,401–1,425 of 100,000</p>
        <aihio-pagination id="paired" page="57" pages="4000" href="#paired-{page}" aria-label="Paired pages"></aihio-pagination>
      </aihio-cluster>
    </div>
  `);
  const lines = (id) => page.locator(`#${id} li`).evaluateAll((entries) => new Set(entries.map((entry) => Math.round(entry.getBoundingClientRect().top))).size);

  expect(await items(page)).toBe('‹ 1 … [57] … 4000 ›');
  await expect(page.locator('#pages')).toHaveAttribute('data-compact', '');
  await expect(page.locator('#pages').getByRole('link', { name: 'Previous' })).toBeVisible();
  expect(await lines('pages')).toBe(1);
  expect(await lines('paired')).toBe(1);

  await page.locator('#column').evaluate((column) => { column.style.width = '50rem'; });
  await expect.poll(() => items(page)).toBe('‹ 1 … 56 [57] 58 … 4000 ›');
  await expect(page.locator('#pages')).not.toHaveAttribute('data-compact');

  await page.locator('#row').evaluate((row) => { row.style.width = '60rem'; });
  await expect.poll(() => items(page, 'paired')).toBe('‹ 1 … 56 [57] 58 … 4000 ›');
});

for (const theme of ['light', 'dark']) {
  test(`links and buttons have no automated accessibility violations (${theme})`, async ({ page }) => {
    await mount(page, `
      <aihio-pagination page="57" pages="4000" href="/requests?page={page}" aria-label="Request pages"></aihio-pagination>
      <aihio-pagination page="1" pages="3" aria-label="Result pages"></aihio-pagination>
    `, { theme });
    await page.getByRole('button', { name: 'Page 2' }).hover();
    const results = await new AxeBuilder({ page }).include('#fixture').analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
  });
}

test('the current page is marked by a border at 3:1 and weight, not colour alone', async ({ page }) => {
  await mount(page, '<aihio-pagination id="pages" page="2" pages="3" href="#page-{page}"></aihio-pagination>');
  const current = page.getByRole('link', { name: 'Page 2' });
  const other = page.getByRole('link', { name: 'Page 3' });
  const [border, weight, otherBorder, otherWeight] = await Promise.all([
    current.evaluate((element) => getComputedStyle(element).borderTopColor),
    current.evaluate((element) => Number(getComputedStyle(element).fontWeight)),
    other.evaluate((element) => getComputedStyle(element).borderTopColor),
    other.evaluate((element) => Number(getComputedStyle(element).fontWeight)),
  ]);
  expect(border).not.toBe(otherBorder);
  expect(weight).toBeGreaterThan(otherWeight);
});
