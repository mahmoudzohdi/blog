import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/showcase/');
});

test('renders the header and every component', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Component showcase');
  await expect(page.locator('.meta')).toContainText(/\d+ min read/);
  await expect(page.locator('.callout')).toHaveCount(3);
  await expect(page.locator('.flow[data-highlight="2"] li')).toHaveCount(4);
  await expect(page.locator('figure.code-block')).toHaveCount(3);
  await expect(page.locator('.code-title').first()).toHaveText('store/modules/auth.js');
  await expect(page.locator('.line.highlighted')).toHaveCount(2);
  await expect(page.locator('.line.diff.add')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Open on StackBlitz' })).toBeVisible();
});

test('adds # links to headings', async ({ page }) => {
  await expect(page.locator('h2#text a.anchor')).toHaveAttribute('href', '#text');
});

test('copy button copies code without removed lines', async ({ page, context }) => {
  // Clipboard permissions are Chromium-only; both projects run Chromium.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const button = page.locator('figure.code-block').nth(1).getByRole('button', { name: 'Copy code' });
  await button.click();
  await expect(button).toHaveText('Copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('window.umami?.track(name)');
  expect(copied).not.toContain('window.umami.track(name)');
});

test('copy fallback selects the code without removed lines', async ({ page }) => {
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error('denied'));
  });
  const button = page.locator('figure.code-block').nth(1).getByRole('button', { name: 'Copy code' });
  await button.click();
  await expect(button).toHaveText(/^Press (⌘C|Ctrl\+C)$/);
  const selected = await page.evaluate(() => {
    const area = document.activeElement as HTMLTextAreaElement;
    return { tag: area.tagName, text: area.value.slice(area.selectionStart, area.selectionEnd) };
  });
  expect(selected.tag).toBe('TEXTAREA');
  expect(selected.text).toContain('window.umami?.track(name)');
  expect(selected.text).not.toContain('window.umami.track(name)');
  await button.focus();
  await expect(page.locator('textarea')).toHaveCount(0);
});

test('side menu follows the current section', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop layout only');
  await page.evaluate(() => document.getElementById('flows-and-figures')?.scrollIntoView());
  await expect(page.locator('.toc a[href="#flows-and-figures"]')).toHaveAttribute('aria-current', 'true');
});

test('section bar appears after the title on phones', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone layout only');
  const bar = page.locator('[data-secbar]');
  await expect(bar).not.toHaveClass(/show/);
  await page.evaluate(() => document.getElementById('flows-and-figures')?.scrollIntoView());
  await expect(bar).toHaveClass(/show/);
  await expect(bar.locator('[data-secbar-cur]')).toHaveText('Flows and figures');
  await bar.getByRole('button').click();
  await expect(page.locator('#secbar-list')).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test('side menu is shown in the page at 390px', async ({ page }) => {
    const toc = page.getByRole('complementary', { name: 'On this page' });
    await expect(toc.getByRole('link', { name: 'Flows and figures' })).toBeVisible();
    await expect(page.locator('[data-secbar]')).toBeHidden();
  });
});
