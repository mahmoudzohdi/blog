import { expect, test } from '@playwright/test';

test('follows the system setting by default', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('remembers the chosen theme across reloads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('sets the theme before any stylesheet', async ({ page }) => {
  await page.goto('/');
  const order = await page.evaluate(() => {
    const head = [...document.head.children];
    const script = head.findIndex((el) => el.tagName === 'SCRIPT' && (el.textContent ?? '').includes("localStorage.getItem('theme')"));
    const style = head.findIndex((el) => el.tagName === 'STYLE' || (el.tagName === 'LINK' && (el as HTMLLinkElement).rel === 'stylesheet'));
    return { script, style };
  });
  expect(order.script).toBeGreaterThanOrEqual(0);
  expect(order.script).toBeLessThan(order.style);
});
