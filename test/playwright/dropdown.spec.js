import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function render(page, markup) {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate(async (root, html) => {
    root.innerHTML = html;
    await customElements.whenDefined('aihio-dropdown');
  }, markup);
}

async function openWithKeyboard(page) {
  await page.getByRole('button', { name: 'Account' }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#menu')).toHaveAttribute('open', '');
}

const accountMenu = `
  <aihio-dropdown id="menu">
    <aihio-button slot="trigger">Account</aihio-button>
    <aihio-dropdown-item>Profile</aihio-dropdown-item>
    <aihio-dropdown-item>Settings</aihio-dropdown-item>
    <aihio-dropdown-item>Security</aihio-dropdown-item>
    <aihio-dropdown-item>Sign out</aihio-dropdown-item>
  </aihio-dropdown>
  <button id="after">After</button>
`;

test('Tab closes the menu and moves on through the page', async ({ page }) => {
  await render(page, accountMenu);
  await openWithKeyboard(page);
  await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('#menu')).not.toHaveAttribute('open', '');
  await expect(page.locator('#after')).toBeFocused();

  await openWithKeyboard(page);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#menu')).not.toHaveAttribute('open', '');
});

test('typeahead moves to the next matching item and cycles on a repeated letter', async ({ page }) => {
  await render(page, accountMenu);
  await openWithKeyboard(page);

  await page.keyboard.press('s');
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeFocused();
  await page.keyboard.press('s');
  await expect(page.getByRole('menuitem', { name: 'Security' })).toBeFocused();

  // A pause starts a new query; a typed word matches as a prefix.
  await page.waitForTimeout(600);
  await page.keyboard.type('si');
  await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeFocused();
});

test('a link item is the menuitem, follows itself, and a disabled one does not', async ({ page }) => {
  await render(page, `
    <aihio-dropdown id="menu">
      <aihio-button slot="trigger">Account</aihio-button>
      <aihio-dropdown-item><a href="#profile">Profile</a></aihio-dropdown-item>
      <aihio-dropdown-item disabled><a href="#billing">Billing</a></aihio-dropdown-item>
      <aihio-dropdown-item><a href="#settings">Settings</a></aihio-dropdown-item>
    </aihio-dropdown>
  `);

  await openWithKeyboard(page);
  const profile = page.getByRole('menuitem', { name: 'Profile' });
  await expect(profile).toBeFocused();
  expect(await profile.evaluate((link) => link.localName)).toBe('a');

  // Disabled items are skipped by the arrow keys.
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#settings$/);
  await expect(page.locator('#menu')).not.toHaveAttribute('open', '');

  await openWithKeyboard(page);
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/#profile$/);

  await page.locator('#menu').evaluate((menu) => menu.open({ focus: null }));
  await page.getByRole('menuitem', { name: 'Billing' }).click({ force: true });
  await expect(page).toHaveURL(/#profile$/);
});

test('an open menu of link items has no automated accessibility violations', async ({ page }) => {
  await render(page, `
    <aihio-dropdown id="menu">
      <aihio-button slot="trigger">Account</aihio-button>
      <aihio-dropdown-item><a href="#profile">Profile</a></aihio-dropdown-item>
      <aihio-dropdown-separator></aihio-dropdown-separator>
      <aihio-dropdown-item value="sign-out">Sign out</aihio-dropdown-item>
    </aihio-dropdown>
  `);
  await openWithKeyboard(page);
  const results = await new AxeBuilder({ page }).include('#fixture').analyze();
  expect(results.violations).toEqual([]);
});
