import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TODAY = new Date('2026-10-09T12:00:00');

async function mount(page, markup, { theme } = {}) {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/test/playwright/fixture.html');
  await page.evaluate(() => customElements.whenDefined('aihio-calendar'));
  await page.locator('#fixture').evaluate((root, { markup, theme }) => {
    if (theme) {
      document.documentElement.dataset.theme = theme;
      getComputedStyle(document.documentElement).color;
    }
    root.innerHTML = markup;
  }, { markup, theme });
}

const day = (page, date, id = 'day') => page.locator(`#${id} td[data-date="${date}"]:not([data-outside])`);
const focusedDate = (page) => page.evaluate(() => document.activeElement?.dataset.date ?? null);

async function listen(page, selector, ...types) {
  await page.locator(selector).evaluate((element, types) => {
    window.recorded = [];
    for (const type of types) {
      element.addEventListener(type, (event) => window.recorded.push({ type, ...event.detail }));
    }
  }, types);
}

const events = (page) => page.evaluate(() => window.recorded);

const bookingField = `
  <form id="form">
    <button id="before" type="button">Before</button>
    <aihio-field>
      <span slot="label">Delivery day</span>
      <aihio-calendar id="day" name="day" value="2026-10-22" min="2026-10-12" max="2026-11-27"></aihio-calendar>
      <span slot="description">Deliveries run until 27 November.</span>
    </aihio-field>
    <button id="after" type="button">After</button>
  </form>
`;

test('choosing a day sets the value, fires aihio-change, and submits as YYYY-MM-DD', async ({ page }) => {
  await mount(page, bookingField);
  await listen(page, '#day', 'aihio-change');
  await expect(day(page, '2026-10-22')).toHaveAttribute('aria-selected', 'true');

  await day(page, '2026-10-29').click();
  await expect(page.locator('#day')).toHaveJSProperty('value', '2026-10-29');
  await expect(day(page, '2026-10-29')).toHaveAttribute('aria-selected', 'true');
  await expect(day(page, '2026-10-22')).not.toHaveAttribute('aria-selected');
  expect(await focusedDate(page), 'the day clicked is focused, and is the tab stop').toBe('2026-10-29');

  // A day before min cannot be chosen.
  await day(page, '2026-10-05').click({ force: true });
  await expect(page.locator('#day')).toHaveJSProperty('value', '2026-10-29');

  expect(await events(page)).toEqual([{ type: 'aihio-change', value: '2026-10-29' }]);
  expect(await page.locator('#form').evaluate((form) => new FormData(form).get('day'))).toBe('2026-10-29');
});

test('the grid is one tab stop, on the chosen day, and the arrow and Page keys move across months', async ({ page }) => {
  await mount(page, bookingField);
  await listen(page, '#day', 'aihio-change', 'aihio-month');

  await page.locator('#before').focus();
  // Previous month, the month and year selects, next month, then the grid.
  for (let stop = 0; stop < 5; stop += 1) await page.keyboard.press('Tab');
  expect(await focusedDate(page)).toBe('2026-10-22');

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(await focusedDate(page)).toBe('2026-11-05');
  await expect(page.getByRole('grid', { name: 'November 2026' })).toBeVisible();
  await page.keyboard.press('PageDown');
  expect(await focusedDate(page), 'held at max').toBe('2026-11-27');

  await page.keyboard.press('Enter');
  await expect(page.locator('#day')).toHaveJSProperty('value', '2026-11-27');
  expect(await focusedDate(page), 'focus stays on the chosen day').toBe('2026-11-27');

  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await focusedDate(page), 'the tab stop is where it was left').toBe('2026-11-27');

  expect(await events(page)).toEqual([
    { type: 'aihio-month', month: '2026-11', start: '2026-11-01', end: '2026-11-30' },
    { type: 'aihio-change', value: '2026-11-27' },
  ]);
});

test('aihio-field names the calendar, a group, and the grid takes the month as its name', async ({ page }) => {
  await mount(page, bookingField);
  const group = page.getByRole('group', { name: 'Delivery day' });
  await expect(group).toHaveAccessibleDescription('Deliveries run until 27 November.');
  await expect(group.getByRole('grid', { name: 'October 2026' })).toBeVisible();

  await page.locator('[slot="label"]').click();
  expect(await focusedDate(page), 'a click on the label focuses the grid').toBe('2026-10-22');

  await page.locator('aihio-field').evaluate((fieldElement) => {
    const error = document.createElement('span');
    error.slot = 'error';
    error.textContent = 'Choose a delivery day.';
    fieldElement.append(error);
  });
  await expect(page.locator('#day')).toHaveAttribute('error', '');
});

test('readonly leaves the months to browse but not the date to change; disabled takes it out of the tab order', async ({ page }) => {
  await mount(page, `
    <button id="before" type="button">Before</button>
    <aihio-calendar id="day" aria-label="Contract start" value="2026-11-02" readonly></aihio-calendar>
    <aihio-calendar id="off" aria-label="Contract end" value="2026-11-30" disabled></aihio-calendar>
    <button id="after" type="button">After</button>
  `);
  await expect(page.locator('#day [role="grid"]')).toHaveAttribute('aria-readonly', 'true');
  await day(page, '2026-11-03').click();
  await expect(page.locator('#day')).toHaveJSProperty('value', '2026-11-02');
  await page.keyboard.press('Enter');
  await expect(page.locator('#day')).toHaveJSProperty('value', '2026-11-02');
  await page.keyboard.press('PageDown');
  await expect(page.getByRole('grid', { name: 'December 2026' })).toBeVisible();

  await expect(page.locator('#off')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#off td[tabindex]')).toHaveCount(0);
  await expect(page.locator('#off [data-calendar-part="next"]')).toBeDisabled();
  await page.locator('#day').evaluate((calendar) => calendar.focus());
  await page.keyboard.press('Tab');
  await expect(page.locator('#after'), 'Tab passes over the disabled calendar').toBeFocused();
});

test('weeks start where the language starts them, unless first-day-of-week says otherwise', async ({ page }) => {
  await mount(page, `
    <aihio-calendar id="us" aria-label="US" lang="en-US" value="2026-10-14"></aihio-calendar>
    <aihio-calendar id="fi" aria-label="FI" lang="fi" value="2026-10-14"></aihio-calendar>
    <aihio-calendar id="eg" aria-label="EG" lang="ar-EG" value="2026-10-14"></aihio-calendar>
    <aihio-calendar id="mon" aria-label="Monday" lang="en-US" value="2026-10-14" first-day-of-week="mon"></aihio-calendar>
  `);
  const firstColumn = (id) => page.locator(`#${id} tbody tr:first-child td`).first();
  await expect(firstColumn('us')).toHaveAttribute('data-date', '2026-09-27');
  await expect(firstColumn('fi')).toHaveAttribute('data-date', '2026-09-28');
  await expect(firstColumn('eg')).toHaveAttribute('data-date', '2026-09-26');
  await expect(firstColumn('mon')).toHaveAttribute('data-date', '2026-09-28');
  await expect(page.locator('#mon th').first()).toHaveText('Mon');

  // The days around the month fill the grid, and are left to the pointer.
  await expect(firstColumn('us')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#us tbody tr:last-child')).toHaveAttribute('aria-hidden', 'true');
});

test.describe('in a browser set to Chinese in Taiwan', () => {
  test.use({ locale: 'zh-TW' });

  test('a lang with no region takes the browser\'s region for its weeks, and keeps its own script', async ({ page }) => {
    await mount(page, `
      <aihio-calendar id="zh" aria-label="交货日期" lang="zh" value="2026-10-14"></aihio-calendar>
      <aihio-calendar id="cn" aria-label="交货日期" lang="zh-CN" value="2026-10-14"></aihio-calendar>
    `);
    // Taiwan's weeks start on Sunday, named in the page's Simplified characters
    // (周, not Taiwan's 週). A region the page names is kept.
    await expect(page.locator('#zh th').first()).toHaveText('周日');
    await expect(page.locator('#cn th').first()).toHaveText('周一');
  });
});

test('a day of another month, clicked, takes the calendar to that month', async ({ page }) => {
  await mount(page, '<aihio-calendar id="day" aria-label="Day" value="2026-10-14"></aihio-calendar>');
  await page.locator('#day td[data-outside][data-date="2026-11-02"]').click();
  await expect(page.locator('#day')).toHaveJSProperty('value', '2026-11-02');
  await expect(page.getByRole('grid', { name: 'November 2026' })).toBeVisible();
  expect(await focusedDate(page)).toBe('2026-11-02');
});

test('value, month, and isDateDisabled, set from script', async ({ page }) => {
  await mount(page, '<aihio-calendar id="day" aria-label="Day" name="day"></aihio-calendar>');
  await listen(page, '#day', 'aihio-change', 'aihio-month');
  const calendar = page.locator('#day');
  await expect(calendar).toHaveJSProperty('month', '2026-10');
  await expect(day(page, '2026-10-09')).toHaveAttribute('aria-current', 'date');

  await calendar.evaluate((element) => { element.value = '2027-03-15'; });
  await expect(page.getByRole('grid', { name: 'March 2027' })).toBeVisible();
  await expect(day(page, '2027-03-15')).toHaveAttribute('aria-selected', 'true');

  await calendar.evaluate((element) => { element.month = '2027-05'; });
  await expect(page.getByRole('grid', { name: 'May 2027' })).toBeVisible();
  await expect(calendar).toHaveJSProperty('value', '2027-03-15');

  // Dates from a server: ruled out once they arrive, by setting the function again.
  await calendar.evaluate((element) => {
    const booked = new Set();
    element.isDateDisabled = (date) => booked.has(date);
    booked.add('2027-05-12');
    element.isDateDisabled = (date) => booked.has(date);
  });
  await expect(day(page, '2027-05-12')).toHaveAttribute('aria-disabled', 'true');
  await day(page, '2027-05-12').click({ force: true });
  await expect(calendar).toHaveJSProperty('value', '2027-03-15');

  // A function that throws is reported, and rules nothing out.
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await calendar.evaluate((element) => {
    element.isDateDisabled = () => { throw new Error('availability failed'); };
  });
  await expect(day(page, '2027-05-12')).not.toHaveAttribute('aria-disabled');
  await expect.poll(() => errors.length).toBeGreaterThan(0);

  // Programmatic changes fire no aihio-change; showing another month fires aihio-month.
  expect((await events(page)).map(({ type, month }) => `${type} ${month}`)).toEqual(['aihio-month 2027-03', 'aihio-month 2027-05']);
});

test('form reset puts the default date back, and <fieldset disabled> stops it submitting', async ({ page }) => {
  await mount(page, `
    <form id="form">
      <fieldset id="fieldset">
        <aihio-calendar id="day" aria-label="Day" name="day" value="2026-10-14"></aihio-calendar>
      </fieldset>
    </form>
  `);
  await listen(page, '#day', 'aihio-change');
  await day(page, '2026-10-20').click();
  await page.locator('#form').evaluate((form) => form.reset());
  await expect(page.locator('#day')).toHaveJSProperty('value', '2026-10-14');
  await expect(day(page, '2026-10-14')).toHaveAttribute('aria-selected', 'true');

  await page.locator('#fieldset').evaluate((fieldset) => { fieldset.disabled = true; });
  await day(page, '2026-10-21').click();
  await expect(page.locator('#day')).toHaveJSProperty('value', '2026-10-14');
  expect(await page.locator('#form').evaluate((form) => new FormData(form).has('day'))).toBe(false);
  expect(await events(page)).toEqual([
    { type: 'aihio-change', value: '2026-10-20' },
    { type: 'aihio-change', value: '2026-10-14' },
  ]);
});

for (const theme of ['light', 'dark']) {
  test(`the calendar has no automated accessibility violations (${theme})`, async ({ page }) => {
    await mount(page, bookingField, { theme });
    await page.locator('#day').evaluate((calendar) => {
      calendar.isDateDisabled = (date) => [0, 6].includes(new Date(date).getUTCDay());
    });
    await day(page, '2026-10-23').focus();
    // #before and #after are the page's bare buttons, only there to tab
    // between. In the dark theme WebKit paints them dark, but computes their
    // background as light grey, and axe, which reads computed colours,
    // reports contrast that is not there.
    const results = await new AxeBuilder({ page }).include('#fixture').exclude('#before').exclude('#after').analyze();
    expect(results.violations).toEqual([]);
  });
}
