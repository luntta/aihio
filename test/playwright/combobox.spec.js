import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const COUNTRIES = `
  <aihio-option value="fi">Finland</aihio-option>
  <aihio-option value="fr">France</aihio-option>
  <aihio-option value="de">Germany</aihio-option>
  <aihio-option value="is">Iceland</aihio-option>
  <aihio-option value="no" disabled>Norway</aihio-option>
  <aihio-option value="se">Sweden</aihio-option>
  <aihio-option value="ax">Åland Islands</aihio-option>
`;

async function mount(page, markup) {
  await page.goto('/test/playwright/fixture.html');
  await page.evaluate(() => customElements.whenDefined('aihio-combobox'));
  await page.locator('#fixture').evaluate((root, html) => {
    root.innerHTML = html;
  }, markup);
}

function field(page, id = 'country') {
  return page.locator(`#${id} [role="combobox"]`);
}

function visibleOptions(page, id = 'country') {
  return page.locator(`#${id} [role="option"]:not([hidden])`);
}

async function activeLabel(page, id = 'country') {
  return page.locator(`#${id}`).evaluate((host) => {
    const activeId = host.control.getAttribute('aria-activedescendant');
    return activeId ? document.getElementById(activeId)?.textContent.trim() : null;
  });
}

const countryField = `
  <form id="form">
    <aihio-field>
      <label slot="label">Country</label>
      <aihio-combobox id="country" name="country" value="fi" placeholder="Search countries">${COUNTRIES}</aihio-combobox>
      <span slot="description">Type to filter.</span>
    </aihio-field>
    <button id="after" type="button">After</button>
  </form>
`;

test('typing filters, highlights the best match, and Enter commits its value', async ({ page }) => {
  await mount(page, countryField);
  const input = field(page);
  await expect(input).toHaveValue('Finland');

  const changes = [];
  await page.exposeFunction('recordChange', (detail) => changes.push(detail));
  await page.locator('#country').evaluate((host) => {
    host.addEventListener('aihio-change', (event) => window.recordChange(event.detail));
  });

  await input.focus();
  await input.selectText();
  await page.keyboard.type('aland');

  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(visibleOptions(page)).toHaveText(['Åland Islands']);
  // Matching ignores case and accents, and the bold run is the text as written.
  await expect(visibleOptions(page).locator('mark')).toHaveText('Åland');
  expect(await activeLabel(page)).toBe('Åland Islands');

  await page.keyboard.press('Enter');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toHaveValue('Åland Islands');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  await expect(page.locator('#country')).toHaveJSProperty('value', 'ax');
  expect(changes).toEqual([{ value: 'ax', label: 'Åland Islands' }]);

  const submitted = await page.locator('#form').evaluate((form) => new FormData(form).get('country'));
  expect(submitted).toBe('ax');
});

test('contains matching ranks prefix matches, then word starts, then the rest', async ({ page }) => {
  await mount(page, `
    <aihio-combobox id="country" aria-label="Country">
      <aihio-option>Reunited</aihio-option>
      <aihio-option>Tanzania, United Republic of</aihio-option>
      <aihio-option>Unity</aihio-option>
      <aihio-option>United States</aihio-option>
      <aihio-option>Canada</aihio-option>
    </aihio-combobox>
  `);

  await field(page).focus();
  await page.keyboard.type('unit');
  await expect(visibleOptions(page)).toHaveText([
    'Unity',
    'United States',
    'Tanzania, United Republic of',
    'Reunited',
  ]);

  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  // With the query gone the author's order comes back, and nothing is
  // highlighted for Enter to take by surprise.
  await expect(visibleOptions(page)).toHaveText([
    'Reunited',
    'Tanzania, United Republic of',
    'Unity',
    'United States',
    'Canada',
  ]);
  expect(await activeLabel(page)).toBeNull();
});

test('arrow keys open on the chosen option, skip disabled options, and wrap', async ({ page }) => {
  await mount(page, countryField);
  const input = field(page);
  await input.focus();

  await page.keyboard.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(visibleOptions(page)).toHaveCount(7);
  expect(await activeLabel(page)).toBe('Finland');
  await expect(page.locator('#country [role="option"][aria-selected="true"]')).toHaveText('Finland');

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(await activeLabel(page)).toBe('Iceland');
  await page.keyboard.press('ArrowDown');
  expect(await activeLabel(page), 'disabled Norway is skipped').toBe('Sweden');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(await activeLabel(page), 'the list wraps').toBe('Finland');
  await page.keyboard.press('ArrowUp');
  expect(await activeLabel(page)).toBe('Åland Islands');
  await page.keyboard.press('PageUp');
  expect(await activeLabel(page), 'PageUp stops at the first option').toBe('Finland');

  await page.keyboard.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Finland');
});

test('Escape reverts unconfirmed text and leaves a closed field\'s Escape to the dialog', async ({ page }) => {
  await mount(page, `
    <aihio-dialog id="dialog" aria-label="Shipping">
      <aihio-combobox id="country" aria-label="Country" value="fi">${COUNTRIES}</aihio-combobox>
    </aihio-dialog>
  `);
  await page.locator('#dialog').evaluate((dialog) => dialog.open());
  const input = field(page);
  await input.focus();
  await input.selectText();
  await page.keyboard.type('swe');
  await expect(input).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toHaveValue('Finland');
  await expect(page.locator('#dialog'), 'the first Escape only closes the list').toHaveAttribute('open', '');

  await page.keyboard.press('Escape');
  await expect(page.locator('#dialog')).not.toHaveAttribute('open', '');
});

test('leaving the field keeps exact matches and reverts anything else', async ({ page }) => {
  await mount(page, countryField);
  const input = field(page);

  await input.focus();
  await input.selectText();
  await page.keyboard.type('SWEDEN');
  await page.locator('#background').click();
  await expect(input).toHaveValue('Sweden');
  await expect(page.locator('#country')).toHaveJSProperty('value', 'se');

  await input.focus();
  await input.selectText();
  await page.keyboard.type('Atlantis');
  await expect(visibleOptions(page)).toHaveCount(0);
  await expect(page.locator('#country [data-combobox-part="message"]')).toHaveText('No results');
  await page.keyboard.press('Enter');
  await expect(input, 'Enter with nothing to choose keeps the list open').toHaveAttribute('aria-expanded', 'true');
  await page.locator('#background').click();
  await expect(input).toHaveValue('Sweden');
  await expect(page.locator('#country')).toHaveJSProperty('value', 'se');

  // Clearing the text and leaving clears the choice.
  await input.focus();
  await input.selectText();
  await page.keyboard.press('Backspace');
  await page.locator('#background').click();
  await expect(page.locator('#country')).toHaveJSProperty('value', '');
});

test('Tab accepts the highlighted option and moves focus on', async ({ page }) => {
  await mount(page, countryField);
  const input = field(page);
  await input.focus();
  await input.selectText();
  await page.keyboard.type('ger');
  await page.keyboard.press('Tab');
  await expect(input).toHaveValue('Germany');
  await expect(page.locator('#after')).toBeFocused();
});

test('pointer: the field opens on press, options pick on click, focus never leaves the input', async ({ page }) => {
  await mount(page, countryField);
  const input = field(page);

  await input.click();
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(input).toBeFocused();

  const sweden = page.locator('#country [role="option"]', { hasText: 'Sweden' });
  await sweden.hover();
  await expect(sweden).toHaveAttribute('data-active', '');
  await sweden.click();
  await expect(input).toHaveValue('Sweden');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toBeFocused();

  const norway = page.locator('#country [role="option"]', { hasText: 'Norway' });
  const toggle = page.locator('#country [data-combobox-part="toggle"]');
  await toggle.click();
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await norway.click({ force: true });
  await expect(input, 'a disabled option cannot be picked').toHaveValue('Sweden');
  await toggle.click();
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toBeFocused();
});

test('the list renders in the top layer and flips above a field near the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await mount(page, `
    <div style="height: 520px"></div>
    <aihio-combobox id="country" aria-label="Country">${COUNTRIES}</aihio-combobox>
  `);
  await field(page).click();
  const popup = page.locator('#country [data-combobox-part="popup"]');
  await expect(popup).toBeVisible();
  await expect(popup).toHaveAttribute('data-side', 'top');

  const [fieldBox, popupBox] = await Promise.all([field(page).boundingBox(), popup.boundingBox()]);
  expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(fieldBox.y);
  expect(Math.round(popupBox.width)).toBeGreaterThanOrEqual(Math.round(fieldBox.width) - 1);

  if (await page.evaluate(() => 'popover' in HTMLElement.prototype)) {
    expect(await popup.evaluate((element) => element.matches(':popover-open'))).toBe(true);
  }
});

test('the toggle and the list stay with the field when a row stretches the element taller', async ({ page }) => {
  await mount(page, `
    <div style="display: flex; gap: 16px; height: 200px">
      <aihio-combobox id="small" aria-label="Home country" size="sm">${COUNTRIES}</aihio-combobox>
      <aihio-combobox id="country" aria-label="Country">${COUNTRIES}</aihio-combobox>
      <aihio-combobox id="large" aria-label="Destination" size="lg">${COUNTRIES}</aihio-combobox>
    </div>
  `);
  for (const id of ['small', 'country', 'large']) {
    const [hostBox, fieldBox, toggleBox] = await Promise.all([
      page.locator(`#${id}`).boundingBox(),
      field(page, id).boundingBox(),
      page.locator(`#${id} [data-combobox-part="toggle"]`).boundingBox(),
    ]);
    expect(hostBox.height, 'the row stretches the element').toBe(200);
    expect(toggleBox.y).toBeCloseTo(fieldBox.y, 1);
    expect(toggleBox.height).toBeCloseTo(fieldBox.height, 1);
    expect(toggleBox.x + toggleBox.width).toBeCloseTo(fieldBox.x + fieldBox.width, 1);
  }

  await field(page).click();
  const popup = page.locator('#country [data-combobox-part="popup"]');
  await expect(popup).toHaveAttribute('data-side', 'bottom');
  await popup.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))
  );
  const [fieldBox, popupBox] = await Promise.all([field(page).boundingBox(), popup.boundingBox()]);
  const gap = popupBox.y - (fieldBox.y + fieldBox.height);
  expect(gap, 'the list opens under the field, not under the element').toBeGreaterThanOrEqual(0);
  expect(gap, 'the list opens under the field, not under the element').toBeLessThanOrEqual(8);
});

test('aihio-field wires the label to the input, the list, and the toggle', async ({ page }) => {
  await mount(page, countryField);
  const host = page.locator('#country');
  const label = page.locator('label[slot="label"]');
  const labelId = await label.getAttribute('id');

  await expect(field(page)).toHaveAttribute('aria-labelledby', labelId);
  await expect(page.locator('#country [role="listbox"]')).toHaveAttribute('aria-labelledby', labelId);
  await expect(page.locator('#country [data-combobox-part="toggle"]')).toHaveAttribute('aria-labelledby', labelId);
  await expect(field(page)).toHaveAttribute('aria-describedby', await page.locator('[slot="description"]').getAttribute('id'));
  await expect(page.getByRole('combobox', { name: 'Country' })).toBeVisible();

  await label.click();
  await expect(field(page)).toBeFocused();
  await expect(field(page), 'focusing by the label does not open the list').toHaveAttribute('aria-expanded', 'false');

  await page.locator('aihio-field').evaluate((fieldElement) => {
    const error = document.createElement('span');
    error.slot = 'error';
    error.textContent = 'Choose a country.';
    fieldElement.append(error);
  });
  await expect(host).toHaveAttribute('error', '');
  await expect(field(page)).toHaveAttribute('aria-invalid', 'true');
});

test('forms: required, reset, and fieldset disabled behave natively', async ({ page }) => {
  await mount(page, `
    <form id="form">
      <fieldset id="fieldset">
        <aihio-combobox id="country" aria-label="Country" name="country" value="de" required>${COUNTRIES}</aihio-combobox>
      </fieldset>
    </form>
  `);
  const host = page.locator('#country');
  const input = field(page);

  await input.focus();
  await input.selectText();
  await page.keyboard.press('Backspace');
  await page.locator('#background').click();
  expect(await host.evaluate((element) => element.checkValidity())).toBe(false);

  await input.focus();
  await page.keyboard.type('ice');
  await page.keyboard.press('Enter');
  expect(await host.evaluate((element) => element.checkValidity())).toBe(true);

  await page.locator('#form').evaluate((form) => form.reset());
  await expect(input).toHaveValue('Germany');
  await expect(host).toHaveJSProperty('value', 'de');

  await page.locator('#fieldset').evaluate((fieldset) => { fieldset.disabled = true; });
  await input.focus({ timeout: 1000 }).catch(() => {});
  await page.keyboard.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('#form').evaluate((form) => new FormData(form).has('country'))).toBe(false);
});

test('allow-custom keeps free text and still offers suggestions', async ({ page }) => {
  await mount(page, `
    <form id="form">
      <aihio-combobox id="tag" aria-label="Tag" name="tag" allow-custom>
        <aihio-option>bug</aihio-option>
        <aihio-option>design</aihio-option>
      </aihio-combobox>
    </form>
  `);
  const input = field(page, 'tag');
  await input.focus();
  await page.keyboard.type('de');
  expect(await activeLabel(page, 'tag'), 'free text is not overridden by a highlight').toBeNull();
  await page.keyboard.type('ployment');
  await page.keyboard.press('Enter');
  await expect(page.locator('#tag')).toHaveJSProperty('value', 'deployment');
  expect(await page.locator('#form').evaluate((form) => new FormData(form).get('tag'))).toBe('deployment');

  await input.selectText();
  await page.keyboard.type('DESIGN');
  await page.keyboard.press('Enter');
  await expect(input, 'an exact match takes the option\'s own spelling').toHaveValue('design');

  // Escape closes the list but keeps free text; the Enter that follows submits
  // the form, and has to submit that text rather than the previous value.
  const submitted = page.locator('#form').evaluate((form) => new Promise((resolve) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      resolve(new FormData(form).get('tag'));
    }, { once: true });
  }));
  await input.selectText();
  await page.keyboard.type('release');
  await page.keyboard.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  expect(await submitted).toBe('release');
});

test('async options: filter="none", loading, re-highlighting, and a count announcement', async ({ page }) => {
  await mount(page, `
    <aihio-combobox id="user" aria-label="User" filter="none" empty-text="Type to search"></aihio-combobox>
  `);
  await page.locator('#user').evaluate((host) => {
    const people = ['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Adele Goldberg'];
    let timer;
    host.addEventListener('aihio-search', (event) => {
      clearTimeout(timer);
      host.setAttribute('loading', '');
      const query = event.detail.query.toLowerCase();
      timer = setTimeout(() => {
        const matches = people.filter((name) => name.toLowerCase().includes(query));
        host.replaceChildren(...matches.map((name) => {
          const option = document.createElement('aihio-option');
          option.textContent = name;
          return option;
        }));
        host.removeAttribute('loading');
      }, 50);
    });
  });

  const input = field(page, 'user');
  await input.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#user [data-combobox-part="message"]')).toHaveText('Type to search');

  await page.keyboard.type('ad');
  await expect(page.locator('#user [role="listbox"]')).not.toHaveAttribute('aria-busy');
  await expect(visibleOptions(page, 'user')).toHaveText(['Ada Lovelace', 'Adele Goldberg']);
  expect(await activeLabel(page, 'user'), 'the first remote result is highlighted').toBe('Ada Lovelace');
  await expect(page.locator('#user [role="status"]')).toHaveText('2 results');

  // replaceChildren() took the input with it on every keystroke. The parts
  // are put back, focus with them, and typing carries on.
  await expect(page.locator('#user > [data-combobox-part="input"]')).toHaveCount(1);
  await expect(input).toBeFocused();
  await page.keyboard.type('e');
  await expect(visibleOptions(page, 'user')).toHaveText(['Adele Goldberg']);
  await expect(input).toHaveValue('ade');

  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('Adele Goldberg');
  await expect(page.locator('#user [role="status"]')).toHaveText('');
});

test('options added and removed by a framework re-render in place', async ({ page }) => {
  await mount(page, `<aihio-combobox id="country" aria-label="Country">${COUNTRIES}</aihio-combobox>`);
  await page.locator('#country').evaluate((host) => {
    host.querySelector('aihio-option[value="fr"]').remove();
    const option = document.createElement('aihio-option');
    option.value = 'ee';
    option.textContent = 'Estonia';
    host.insertBefore(option, host.querySelector('aihio-option[value="fi"]'));
    host.querySelector('aihio-option[value="de"]').textContent = 'Deutschland';
  });
  await field(page).click();
  await expect(visibleOptions(page)).toHaveText([
    'Estonia', 'Finland', 'Deutschland', 'Iceland', 'Norway', 'Sweden', 'Åland Islands',
  ]);
  // The authored options stay direct children of the host, where the
  // framework that rendered them expects to find them.
  expect(await page.locator('#country > aihio-option').count()).toBe(7);
});

test('the combobox has no automated accessibility violations, open or closed', async ({ page }) => {
  await mount(page, countryField);
  const closed = await new AxeBuilder({ page }).include('#fixture').analyze();
  expect(closed.violations).toEqual([]);

  await field(page).focus();
  await field(page).selectText();
  await page.keyboard.type('f');
  await expect(visibleOptions(page)).toHaveCount(2);
  // Audit the settled list, not a frame of its fade-in: mid-animation the
  // option text is still blended toward the background.
  await page.locator('#country [data-combobox-part="popup"]').evaluate((popup) =>
    Promise.all(popup.getAnimations({ subtree: true }).map((animation) => animation.finished))
  );
  const open = await new AxeBuilder({ page }).include('#fixture').analyze();
  expect(open.violations).toEqual([]);
});
