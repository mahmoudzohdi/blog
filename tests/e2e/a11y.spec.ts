import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function seriousProblems(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('giscus-comments')
    .analyze();
  const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  return blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
}

for (const path of ['/', '/showcase/', '/tags/', '/tags/vue/', '/no-such-page/']) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${path} has no serious accessibility problems (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      expect(await seriousProblems(page)).toEqual([]);
    });
  }
}

test('open phone menu has no serious accessibility problems', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone layout only');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('#m-nav')).toBeVisible();
  expect(await seriousProblems(page)).toEqual([]);
});
