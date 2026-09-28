import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Patterns are the markup agents copy, so each one is held to the same bar as
// a component: rendered for real, with no automated accessibility violations.
const schema = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../dist/schema.json'), 'utf8'));
const candidates = schema.patterns.flatMap((pattern) => [
  { id: pattern.id, markup: pattern.markup },
  ...(pattern.variations ?? []).map((variation) => ({ id: `${pattern.id}/${variation.id}`, markup: variation.markup })),
]);

for (const { id, markup } of candidates) {
  for (const theme of ['light', 'dark']) {
    test(`pattern ${id} has no automated accessibility violations (${theme})`, async ({ page }) => {
      await page.goto('/test/playwright/fixture.html');
      // The theme is set before the markup exists, so nothing is caught
      // mid-transition when axe measures contrast.
      await page.locator('#fixture').evaluate(async (root, { html, theme }) => {
        document.documentElement.dataset.theme = theme;
        root.innerHTML = html;
        await Promise.all([...root.querySelectorAll('*')]
          .filter((element) => element.localName.startsWith('aihio-'))
          .map((element) => customElements.whenDefined(element.localName)));
      }, { html: markup, theme });

      const results = await new AxeBuilder({ page }).include('#fixture').analyze();
      expect(results.violations.map(({ id: rule, nodes }) => ({ rule, targets: nodes.map((node) => node.target) }))).toEqual([]);
    });
  }
}
