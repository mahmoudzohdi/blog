import { expect, test } from '@playwright/test';

test('unknown pages show the 404 page', async ({ page }) => {
  const response = await page.goto('/no-such-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
});

test('posts carry canonical, Open Graph and JSON-LD tags', async ({ page }) => {
  await page.goto('/showcase/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://blog.zohdi.me/showcase/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://blog.zohdi.me/og/showcase.png');
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
  expect(jsonLd['@type']).toBe('BlogPosting');
  expect(jsonLd.author['@id']).toBe('https://zohdi.me/#person');
});

test('serves the OG image and the RSS feed', async ({ request }) => {
  const og = await request.get('/og/showcase.png');
  expect(og.headers()['content-type']).toContain('image/png');
  const xml = await (await request.get('/rss.xml')).text();
  expect(xml).toContain('https://blog.zohdi.me/showcase/');
  expect(xml).not.toContain('<script');
});
