import { expect, test } from '@playwright/test';

test('lists writing and talks grouped by year', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notes from building for the web');
  await expect(page.getByRole('heading', { level: 2, name: '2019' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Login First/ })).toHaveAttribute('href', /medium\.com/);
});

test('topic filter shows only matching entries', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'talks', exact: true }).click();
  await expect(page.getByRole('link', { name: /live prototype/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Login First/ })).toBeHidden();
  await expect(page).toHaveURL(/\?topic=talks/);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByRole('link', { name: /Login First/ })).toBeVisible();
});

test('no page scrolls sideways', async ({ page }) => {
  for (const path of ['/', '/showcase/', '/tags/', '/tags/vue/']) {
    await page.goto(path);
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
  });
});
