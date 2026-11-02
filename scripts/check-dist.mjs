import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readPosts } from './lib/content.mjs';
import { findBroken } from './lib/links.mjs';

const DIST = 'dist';
const ORIGIN = 'https://blog.zohdi.me'; // keep in sync with src/lib/site.ts SITE.url

// dist/ is what gets deployed; a SHOW_DRAFTS build would publish drafts, so never pass it.
if (process.env.SHOW_DRAFTS === '1') {
  console.error('SHOW_DRAFTS=1 is set; refusing to pass dist/ (drafts would be published)');
  process.exit(1);
}

// Links to ORIGIN are only checked when it matches the built site, so a changed SITE.url must not
// silently turn that check off.
const home = await readFile(join(DIST, 'index.html'), 'utf8').catch(() => '');
const canonical = home.match(/<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]*)"/)?.[1];
if (!canonical?.startsWith(`${ORIGIN}/`)) {
  console.error(
    `dist/index.html canonical URL is ${canonical ?? 'missing'}, expected it under ${ORIGIN}/. ` +
      'Update ORIGIN in scripts/check-dist.mjs to match SITE.url in src/lib/site.ts.',
  );
  process.exit(1);
}

const htmlFiles = (await readdir(DIST, { recursive: true })).filter((f) => f.endsWith('.html')).map((f) => join(DIST, f));
const pages = await Promise.all(htmlFiles.map(async (file) => ({ file, html: await readFile(file, 'utf8') })));
const problems = findBroken(pages, (p) => existsSync(join(DIST, p)), ORIGIN).map(({ file, ref }) => `${file}: broken link ${ref}`);

const rss = await readFile(join(DIST, 'rss.xml'), 'utf8').catch(() => '');
for (const { slug, data } of await readPosts('src/content/posts')) {
  if (!data.draft) continue;
  if (existsSync(join(DIST, slug))) problems.push(`draft "${slug}" was published to dist/${slug}/`);
  if (existsSync(join(DIST, 'og', `${slug}.png`))) problems.push(`draft "${slug}" has an OG image at dist/og/${slug}.png`);
  // Full URL, not a bare /<slug>/: post bodies in the feed can hold external links or tag paths.
  if (rss.includes(`${ORIGIN}/${slug}/`)) problems.push(`draft "${slug}" is listed in dist/rss.xml`);
}

if (problems.length > 0) {
  console.error(`Built-site check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`Built-site check passed: ${pages.length} pages, no broken links, no drafts.`);
