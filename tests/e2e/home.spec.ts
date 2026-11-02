import { expect, test } from '@playwright/test';

// Elsewhere entries come from the test-only src/content/fixtures/elsewhere.yaml.
test('lists writing and talks grouped by year', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notes from building for the web');
  await expect(page.getByRole('heading', { level: 2, name: '2026' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: '2019' })).toBeVisible();
  const article = page.getByRole('link', { name: /Fixture article/ });
  await expect(article).toHaveAttribute('href', /medium\.com/);
  await expect(article).toHaveAccessibleName(/\(opens Medium\)$/);
  await expect(page.getByRole('listitem').filter({ has: article }).locator('.kind')).toHaveText('Medium');
  const talk = page.getByRole('link', { name: /Fixture talk/ });
  await expect(talk).toHaveAccessibleName(/\(opens Example Conf\)$/);
  await expect(page.getByRole('listitem').filter({ has: talk }).locator('.kind')).toHaveText('Talk');
});

test('topic filter shows only matching entries', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'talks', exact: true }).click();
  await expect(page.getByRole('link', { name: /Fixture talk/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Fixture article/ })).toBeHidden();
  await expect(page).toHaveURL(/\?topic=talks/);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByRole('link', { name: /Fixture article/ })).toBeVisible();
});

test('no page scrolls sideways', async ({ page }) => {
  // /tags/vue/ exists in the test build through the fixture article.
  for (const path of ['/', '/showcase/', '/tags/', '/tags/vue/']) {
    expect((await page.goto(path))?.status(), path).toBe(200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('phone menu opens the navigation', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone layout only');
  await page.goto('/');
  await expect(page.locator('#m-nav')).toBeHidden();
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#m-nav').getByRole('link', { name: 'Tags' })).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('phone menu links are shown in the page', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'phone layout only');
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
    const nav = page.locator('#m-nav');
    for (const name of ['Posts', 'Tags', 'RSS', 'zohdi.me']) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
    // Controls that need JS are hidden rather than left doing nothing
    await expect(page.locator('[data-theme-toggle]')).toBeHidden();
    await expect(page.locator('.filter')).toBeHidden();
  });
});
