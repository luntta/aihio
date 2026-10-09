import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Today is pinned, so "today" in the grid and a typed date without a year are
// the same whenever the suite runs.
const TODAY = new Date('2026-10-09T12:00:00');

async function mount(page, markup) {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/test/playwright/fixture.html');
  await page.evaluate(() => customElements.whenDefined('aihio-date-picker'));
  await page.locator('#fixture').evaluate((root, html) => {
    root.innerHTML = html;
  }, markup);
}

const field = (page, id = 'due') => page.locator(`#${id} [data-date-picker-part="input"]`);
const toggle = (page, id = 'due') => page.locator(`#${id} [data-date-picker-part="toggle"]`);
const popup = (page, id = 'due') => page.locator(`#${id} [data-date-picker-part="popup"]`);
const day = (page, date, id = 'due') => page.locator(`#${id} td[data-date="${date}"]:not([data-outside])`);
const focusedDate = (page) => page.evaluate(() => document.activeElement?.dataset.date ?? null);

/** Collect the detail of every `type` event the element fires, for `events(page)` to read. */
async function listen(page, selector, ...types) {
  await page.locator(selector).evaluate((element, types) => {
    window.recorded = [];
    for (const type of types) {
      element.addEventListener(type, (event) => window.recorded.push({ type, ...event.detail }));
    }
  }, types);
}

const events = (page) => page.evaluate(() => window.recorded);

const dueDateField = `
  <form id="form">
    <aihio-field>
      <label slot="label">Due date</label>
      <aihio-date-picker id="due" name="due" value="2026-10-14"></aihio-date-picker>
      <span slot="description">Invoices go out on this day.</span>
    </aihio-field>
    <button id="after" type="button">After</button>
  </form>
`;

test('a typed date is read the way the page writes dates, shown back that way, and submits as YYYY-MM-DD', async ({ page }) => {
  await mount(page, `
    <form id="form">
      <aihio-date-picker id="due" name="due" aria-label="Due date"></aihio-date-picker>
      <aihio-date-picker id="uk" name="uk" aria-label="Due date (UK)" lang="en-GB"></aihio-date-picker>
    </form>
  `);
  await listen(page, '#due', 'aihio-change');
  await expect(field(page)).toHaveAttribute('placeholder', 'mm/dd/yyyy');
  await expect(field(page, 'uk')).toHaveAttribute('placeholder', 'dd/mm/yyyy');

  // Leaving the field commits what was typed, and writes it back in full.
  await field(page).fill('10/9/26');
  await page.keyboard.press('Tab');
  await expect(field(page)).toHaveValue('10/09/2026');
  await expect(page.locator('#due')).toHaveJSProperty('value', '2026-10-09');

  // The same figures are another day in Britain.
  await field(page, 'uk').fill('10/9/26');
  await page.keyboard.press('Tab');
  await expect(page.locator('#uk')).toHaveJSProperty('value', '2026-09-10');

  // Written out, with a year first, or run together, it is still a date.
  for (const [typed, value] of [['Oct 12, 2026', '2026-10-12'], ['2026-10-13', '2026-10-13'], ['10142026', '2026-10-14'], ['10/15', '2026-10-15']]) {
    await field(page).fill(typed);
    await page.keyboard.press('Tab');
    await expect(page.locator('#due'), typed).toHaveJSProperty('value', value);
  }

  expect((await events(page)).map(({ value }) => value)).toEqual(['2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']);
  expect(await page.locator('#form').evaluate((form) => Object.fromEntries(new FormData(form)))).toEqual({ due: '2026-10-15', uk: '2026-09-10' });
});

test('a Finnish page writes and reads dates the Finnish way', async ({ page }) => {
  await mount(page, '<aihio-date-picker id="due" name="due" aria-label="Eräpäivä" lang="fi"></aihio-date-picker><button id="after" type="button">After</button>');
  await expect(field(page)).toHaveAttribute('placeholder', 'pp.kk.vvvv');

  for (const typed of ['9.10.2026', '9.10.', '9. lokakuuta 2026', '09102026', '9.10.26']) {
    await field(page).fill(typed);
    await page.keyboard.press('Tab');
    await expect(page.locator('#due'), typed).toHaveJSProperty('value', '2026-10-09');
    await expect(field(page)).toHaveValue('09.10.2026');
  }

  // Weeks start on Monday, and the months have their Finnish names.
  await toggle(page).click();
  await expect(popup(page).locator('[data-calendar-part="month"] option:checked')).toHaveText('Lokakuu');
  await expect(popup(page).locator('th').first()).toHaveText('ma');
  await expect(day(page, '2026-10-09')).toHaveAttribute('aria-label', 'perjantaina 9. lokakuuta 2026');
});

test('text that is not a date is kept to be corrected, and the field is invalid until it is', async ({ page }) => {
  await mount(page, `
    <form id="form">
      <aihio-date-picker id="due" name="due" aria-label="Eräpäivä" lang="fi" invalid-text="Kirjoita päivä muodossa {format}."></aihio-date-picker>
      <button id="after" type="button">After</button>
    </form>
  `);
  const host = page.locator('#due');

  await field(page).fill('31.2.2026');
  await page.keyboard.press('Tab');
  await expect(field(page)).toHaveValue('31.2.2026');
  await expect(host).toHaveJSProperty('value', '');
  await expect(host).toHaveJSProperty('validationMessage', 'Kirjoita päivä muodossa pp.kk.vvvv.');
  expect(await page.locator('#form').evaluate((form) => form.checkValidity())).toBe(false);

  await field(page).fill('28.2.2026');
  await page.keyboard.press('Tab');
  await expect(host).toHaveJSProperty('value', '2026-02-28');
  await expect(host).toHaveJSProperty('validationMessage', '');
  expect(await page.locator('#form').evaluate((form) => form.checkValidity())).toBe(true);
});

test('the button opens the calendar on the chosen date, as a named dialog, and Escape hands focus back', async ({ page }) => {
  await mount(page, dueDateField);
  await listen(page, '#due', 'aihio-open', 'aihio-close');
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('dialog', { name: 'Choose date Due date' })).toBeVisible();
  await expect(page.getByRole('grid', { name: 'October 2026' })).toBeVisible();
  expect(await focusedDate(page)).toBe('2026-10-14');
  await expect(day(page, '2026-10-14')).toHaveAttribute('aria-selected', 'true');
  await expect(day(page, '2026-10-09')).toHaveAttribute('aria-current', 'date');
  await expect(day(page, '2026-10-14')).toHaveAttribute('aria-label', 'Wednesday, October 14, 2026');

  await page.keyboard.press('Escape');
  await expect(popup(page)).toBeHidden();
  await expect(toggle(page)).toBeFocused();
  await expect(page.locator('#due')).toHaveJSProperty('value', '2026-10-14');
  expect(await events(page)).toEqual([{ type: 'aihio-open' }, { type: 'aihio-close', reason: 'escape' }]);
});

test('the grid keyboard moves by day, week, month, and year, and Enter picks', async ({ page }) => {
  await mount(page, dueDateField);
  await listen(page, '#due', 'aihio-change', 'aihio-close');

  // Opened from the keyboard, focus lands on the chosen day.
  await toggle(page).focus();
  await page.keyboard.press('Enter');
  expect(await focusedDate(page)).toBe('2026-10-14');

  const moves = [
    ['ArrowRight', '2026-10-15'],
    ['ArrowDown', '2026-10-22'],
    ['ArrowLeft', '2026-10-21'],
    ['ArrowUp', '2026-10-14'],
    // A US week runs Sunday to Saturday.
    ['Home', '2026-10-11'],
    ['End', '2026-10-17'],
    ['PageDown', '2026-11-17'],
    ['Shift+PageDown', '2027-11-17'],
    ['PageUp', '2027-10-17'],
    ['Shift+PageUp', '2026-10-17'],
    ['ArrowDown', '2026-10-24'],
    ['ArrowDown', '2026-10-31'],
    // Into the next month, which the grid now shows.
    ['ArrowRight', '2026-11-01'],
  ];
  for (const [key, date] of moves) {
    await page.keyboard.press(key);
    expect(await focusedDate(page), key).toBe(date);
  }
  await expect(page.getByRole('grid', { name: 'November 2026' })).toBeVisible();
  await expect(day(page, '2026-11-01')).toHaveAttribute('tabindex', '0');
  expect(await page.locator('#due td[tabindex="0"]').count(), 'the grid is one tab stop').toBe(1);

  await page.keyboard.press('Enter');
  await expect(popup(page)).toBeHidden();
  await expect(toggle(page)).toBeFocused();
  await expect(field(page)).toHaveValue('11/01/2026');
  await expect(page.locator('#due')).toHaveJSProperty('value', '2026-11-01');
  expect(await events(page)).toEqual([{ type: 'aihio-change', value: '2026-11-01' }, { type: 'aihio-close', reason: 'select' }]);

  // The button now says what is chosen.
  await expect(toggle(page)).toHaveAccessibleDescription('Sunday, November 1, 2026');
});

test('min, max, and isDateDisabled strike days out, hold the keyboard, and make a typed date invalid', async ({ page }) => {
  await mount(page, `
    <form id="form">
      <aihio-date-picker id="due" name="due" aria-label="Delivery" value="2026-10-06" min="2026-10-05" max="2026-11-20"></aihio-date-picker>
      <button id="after" type="button">After</button>
    </form>
  `);
  const host = page.locator('#due');
  await host.evaluate((picker) => {
    picker.isDateDisabled = (date) => [0, 6].includes(new Date(date).getUTCDay());
  });

  await toggle(page).click();
  await expect(popup(page).locator('[data-calendar-part="previous"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(day(page, '2026-10-04')).toHaveAttribute('aria-disabled', 'true');
  await expect(day(page, '2026-10-10'), 'a Saturday').toHaveAttribute('aria-disabled', 'true');
  await expect(day(page, '2026-10-12')).not.toHaveAttribute('aria-disabled');

  // The keyboard stops at min and max.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  expect(await focusedDate(page)).toBe('2026-10-05');
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  expect(await focusedDate(page)).toBe('2026-11-20');
  await expect(popup(page).locator('[data-calendar-part="next"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(popup(page).locator('[data-calendar-part="month"] option[value="12"]')).toHaveJSProperty('disabled', true);

  // A Saturday is a tab stop like any other day, but Enter does not take it.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  expect(await focusedDate(page)).toBe('2026-11-14');
  await page.keyboard.press('Enter');
  await expect(popup(page)).toBeVisible();
  await expect(host).toHaveJSProperty('value', '2026-10-06');
  await page.keyboard.press('Escape');

  // Typed, each is the value, as a native date input keeps a date outside
  // its range, and the field says why it is invalid.
  for (const [typed, message] of [
    ['11/14/2026', '11/14/2026 is not available.'],
    ['12/1/2026', 'Choose 11/20/2026 or earlier.'],
    ['10/1/2026', 'Choose 10/05/2026 or later.'],
  ]) {
    await field(page).fill(typed);
    await page.keyboard.press('Tab');
    await expect(host).toHaveJSProperty('validationMessage', message);
    expect(await page.locator('#form').evaluate((form) => form.checkValidity())).toBe(false);
  }

  // Ruling out other dates takes effect at once.
  await host.evaluate((picker) => {
    picker.isDateDisabled = null;
    picker.setAttribute('min', '2026-09-01');
  });
  await expect(host).toHaveJSProperty('validationMessage', '');
});

test('the month buttons and selects change the month, a step is announced, and aihio-month says which', async ({ page }) => {
  await mount(page, dueDateField);
  await listen(page, '#due', 'aihio-month');
  await page.locator('#form').evaluate((form) => {
    for (const type of ['input', 'change']) {
      form.addEventListener(type, () => { window.formChanges = (window.formChanges ?? 0) + 1; });
    }
  });

  await toggle(page).click();
  const next = popup(page).locator('[data-calendar-part="next"]');
  await expect(next).toHaveAccessibleName('Next month');
  await next.click();
  await expect(page.getByRole('grid', { name: 'November 2026' })).toBeVisible();
  await expect(popup(page).locator('[role="status"]')).toHaveText('November 2026');
  await expect(next).toBeFocused();

  // Choosing a year keeps focus on the select, and the calendar open.
  const year = popup(page).getByRole('combobox', { name: 'Year' });
  await year.focus();
  await year.selectOption('1987');
  await expect(page.getByRole('grid', { name: 'November 1987' })).toBeVisible();
  await expect(year).toBeFocused();
  await expect(popup(page)).toBeVisible();
  // The tab stop keeps its day of the month.
  await expect(day(page, '1987-11-14')).toHaveAttribute('tabindex', '0');

  await popup(page).getByRole('combobox', { name: 'Month' }).selectOption('2');
  await expect(page.getByRole('grid', { name: 'February 1987' })).toBeVisible();

  // The selects are the calendar's own controls: their change events stay
  // inside it, and the date is unchanged until a day is picked.
  expect(await page.evaluate(() => window.formChanges ?? 0)).toBe(0);
  await expect(page.locator('#due')).toHaveJSProperty('value', '2026-10-14');

  expect((await events(page)).map(({ month }) => month)).toEqual(['2026-10', '2026-11', '1987-11', '1987-02']);
  expect((await events(page)).at(-1)).toEqual({ type: 'aihio-month', month: '1987-02', start: '1987-02-01', end: '1987-02-28' });
});

test('Alt+ArrowDown opens the calendar from the field, and focus comes back to the field', async ({ page }) => {
  await mount(page, dueDateField);
  await field(page).focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(popup(page)).toBeVisible();
  expect(await focusedDate(page)).toBe('2026-10-14');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press(' ');
  await expect(popup(page)).toBeHidden();
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue('10/15/2026');
});

test('an empty field opens on today', async ({ page }) => {
  await mount(page, '<aihio-date-picker id="due" aria-label="Due date"></aihio-date-picker>');
  await toggle(page).click();
  expect(await focusedDate(page)).toBe('2026-10-09');
  await expect(day(page, '2026-10-09')).toHaveAttribute('aria-current', 'date');
  await expect(page.locator('#due [aria-selected="true"]')).toHaveCount(0);
});

test('the calendar follows a date typed while it is open', async ({ page }) => {
  await mount(page, dueDateField);
  await toggle(page).click();
  await field(page).click();
  await expect(popup(page), 'focus moving into the field keeps it open').toBeVisible();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('12/25/2026');
  await expect(page.getByRole('grid', { name: 'December 2026' })).toBeVisible();
  await expect(day(page, '2026-12-25')).toHaveAttribute('aria-selected', 'true');

  // Enter commits it and closes the calendar, without submitting the form.
  await page.locator('#form').evaluate((form) => form.addEventListener('submit', () => { window.submitted = true; }));
  await page.keyboard.press('Enter');
  await expect(popup(page)).toBeHidden();
  await expect(page.locator('#due')).toHaveJSProperty('value', '2026-12-25');
  expect(await page.evaluate(() => window.submitted ?? false)).toBe(false);
});

test('a day of the next month, shown in the last row, is picked by the pointer', async ({ page }) => {
  await mount(page, dueDateField);
  await toggle(page).click();
  const outside = page.locator('#due td[data-outside][data-date="2026-11-04"]');
  await expect(outside).toHaveAttribute('aria-hidden', 'true');
  await expect(outside).not.toHaveAttribute('tabindex');
  await outside.click();
  await expect(popup(page)).toBeHidden();
  await expect(page.locator('#due')).toHaveJSProperty('value', '2026-11-04');
  await expect(toggle(page)).toBeFocused();
});

test('focus leaving the field or a press outside closes the calendar', async ({ page }) => {
  await mount(page, dueDateField);
  await listen(page, '#due', 'aihio-close');

  await toggle(page).click();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
  await expect(popup(page)).toBeHidden();

  await toggle(page).click();
  await page.locator('#background').click();
  await expect(popup(page)).toBeHidden();

  await toggle(page).click();
  await toggle(page).click();
  await expect(popup(page)).toBeHidden();
  expect((await events(page)).map(({ reason }) => reason)).toEqual(['blur', 'outside', 'toggle']);
});

test('Escape on a closed field is left to the dialog around it', async ({ page }) => {
  await mount(page, `
    <aihio-dialog id="dialog" aria-label="Schedule">
      <aihio-date-picker id="due" aria-label="Due date" value="2026-10-14"></aihio-date-picker>
    </aihio-dialog>
  `);
  await page.locator('#dialog').evaluate((dialog) => dialog.open());
  await field(page).focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(popup(page)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(popup(page)).toBeHidden();
  await expect(page.locator('#dialog'), 'the first Escape only closes the calendar').toHaveAttribute('open', '');
  await expect(field(page)).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.locator('#dialog')).not.toHaveAttribute('open', '');
});

test('forms: required, reset, fieldset disabled, and the form attribute behave natively', async ({ page }) => {
  await mount(page, `
    <form id="form">
      <fieldset id="fieldset">
        <aihio-date-picker id="due" aria-label="Due date" name="due" value="2026-10-14" required></aihio-date-picker>
      </fieldset>
      <button id="after" type="button">After</button>
    </form>
    <form id="other"></form>
    <aihio-date-picker id="remote" aria-label="Start date" name="start" value="2026-10-01" form="other"></aihio-date-picker>
  `);
  const host = page.locator('#due');

  await field(page).fill('');
  await page.keyboard.press('Tab');
  await expect(host).toHaveJSProperty('value', '');
  expect(await host.evaluate((picker) => picker.validity.valueMissing)).toBe(true);

  await field(page).fill('10/20/2026');
  await page.keyboard.press('Tab');
  expect(await host.evaluate((picker) => picker.checkValidity())).toBe(true);

  await page.locator('#form').evaluate((form) => form.reset());
  await expect(field(page)).toHaveValue('10/14/2026');
  await expect(host).toHaveJSProperty('value', '2026-10-14');

  expect(await page.locator('#other').evaluate((form) => new FormData(form).get('start'))).toBe('2026-10-01');

  await page.locator('#fieldset').evaluate((fieldset) => { fieldset.disabled = true; });
  await toggle(page).click({ force: true });
  await expect(popup(page)).toBeHidden();
  expect(await page.locator('#form').evaluate((form) => new FormData(form).has('due'))).toBe(false);
});

test('aihio-field names the field, the button, and the calendar, and sets the error state', async ({ page }) => {
  await mount(page, dueDateField);
  await expect(page.getByRole('textbox', { name: 'Due date' })).toHaveAccessibleDescription('Invoices go out on this day.');
  await expect(page.getByRole('button', { name: 'Choose date Due date' })).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(toggle(page)).toHaveAccessibleDescription('Wednesday, October 14, 2026');

  await page.locator('label[slot="label"]').click();
  await expect(field(page)).toBeFocused();
  await expect(popup(page), 'focusing by the label does not open the calendar').toBeHidden();

  await page.locator('aihio-field').evaluate((fieldElement) => {
    const error = document.createElement('span');
    error.slot = 'error';
    error.textContent = 'Choose a weekday.';
    fieldElement.append(error);
  });
  await expect(page.locator('#due')).toHaveAttribute('error', '');
  await expect(field(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(field(page)).toHaveAccessibleDescription('Choose a weekday.');
});

test('the calendar renders in the top layer and flips above a field near the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await mount(page, `
    <div style="padding: 480px 24px 0">
      <aihio-date-picker id="due" aria-label="Due date" value="2026-10-14"></aihio-date-picker>
    </div>
  `);
  await toggle(page).click();
  await expect(popup(page)).toHaveAttribute('data-side', 'top');
  const [fieldBox, popupBox] = await Promise.all([field(page).boundingBox(), popup(page).boundingBox()]);
  expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(fieldBox.y);
  expect(Math.abs(popupBox.x - fieldBox.x)).toBeLessThanOrEqual(1);

  if (await page.evaluate(() => 'popover' in HTMLElement.prototype)) {
    expect(await popup(page).evaluate((element) => element.matches(':popover-open'))).toBe(true);
  }
});

test('right to left, the arrow keys follow the reading direction', async ({ page }) => {
  await mount(page, '<div dir="rtl"><aihio-date-picker id="due" aria-label="تاريخ" lang="ar-EG" value="2026-10-14"></aihio-date-picker></div>');
  await expect(field(page)).toHaveValue('١٤‏/١٠‏/٢٠٢٦');
  await toggle(page).click();
  await page.keyboard.press('ArrowLeft');
  expect(await focusedDate(page)).toBe('2026-10-15');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect(await focusedDate(page)).toBe('2026-10-13');
  // An Egyptian week starts on Saturday.
  await page.keyboard.press('Home');
  expect(await focusedDate(page)).toBe('2026-10-10');
});

test('properties: value clears on anything that is not a date, valueAsDate is a UTC midnight, setCustomValidity wins', async ({ page }) => {
  await mount(page, '<aihio-date-picker id="due" aria-label="Due date" value="2026-10-14"></aihio-date-picker>');
  const result = await page.locator('#due').evaluate((picker) => {
    const seen = {};
    picker.value = '2026-02-30';
    seen.invalid = picker.value;
    picker.valueAsDate = new Date(Date.UTC(2026, 9, 9));
    seen.fromDate = picker.value;
    seen.text = picker.control.value;
    seen.asDate = picker.valueAsDate.toISOString();
    picker.setCustomValidity('Pick a day the office is open.');
    seen.custom = picker.validationMessage;
    picker.setCustomValidity('');
    seen.cleared = picker.validationMessage;
    seen.defaultValue = picker.defaultValue;
    return seen;
  });
  expect(result).toEqual({
    invalid: '',
    fromDate: '2026-10-09',
    text: '10/09/2026',
    asDate: '2026-10-09T00:00:00.000Z',
    custom: 'Pick a day the office is open.',
    cleared: '',
    defaultValue: '2026-10-14',
  });
});

test('a property set before the element is defined is not lost', async ({ page }) => {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/test/playwright/fixture.html');
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('aihio-date-picker');
    // An element of a tag not yet defined stays a plain element, as a
    // framework may render one before the module loads.
    const element = document.createElement('aihio-late-picker');
    element.value = '2026-10-20';
    element.isDateDisabled = () => true;
    class Late extends customElements.get('aihio-date-picker') {}
    customElements.define('aihio-late-picker', Late);
    customElements.upgrade(element);
    element.setAttribute('aria-label', 'Late');
    document.querySelector('#fixture').append(element);
    return { value: element.value, text: element.control.value, rules: typeof element.isDateDisabled };
  });
  expect(result).toEqual({ value: '2026-10-20', text: '10/20/2026', rules: 'function' });
});

test('moving the element does not open the calendar again', async ({ page }) => {
  await mount(page, '<aihio-date-picker id="due" aria-label="Due date"></aihio-date-picker><div id="elsewhere"></div>');
  await toggle(page).click();
  await expect(popup(page)).toBeVisible();
  await page.locator('#due').evaluate((picker) => document.querySelector('#elsewhere').append(picker));
  await expect(popup(page)).toBeHidden();
  await expect(page.locator('#due')).not.toHaveAttribute('open', '');
});

for (const theme of ['light', 'dark']) {
  test(`the date picker has no automated accessibility violations, open or closed (${theme})`, async ({ page }) => {
    await mount(page, '');
    await page.locator('#fixture').evaluate((root, { html, theme }) => {
      document.documentElement.dataset.theme = theme;
      getComputedStyle(document.documentElement).color;
      root.innerHTML = html;
    }, { html: dueDateField, theme });
    await page.locator('#due').evaluate((picker) => {
      picker.isDateDisabled = (date) => [0, 6].includes(new Date(date).getUTCDay());
    });

    // #after is the page's bare <button>, only there to tab to. In the dark
    // theme WebKit paints it dark, but computes its background as light grey,
    // and axe, which reads computed colours, reports contrast that is not there.
    const audit = () => new AxeBuilder({ page }).include('#fixture').exclude('#after').analyze();
    const closed = await audit();
    expect(closed.violations).toEqual([]);

    await toggle(page).click();
    // Audit the settled calendar, not a frame of its fade-in.
    await popup(page).evaluate((element) =>
      Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))
    );
    const open = await audit();
    expect(open.violations).toEqual([]);
  });
}
