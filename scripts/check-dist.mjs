import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readPosts } from './lib/content.mjs';
import { findBroken } from './lib/links.mjs';

const DIST = 'dist';
const ORIGIN = 'https://blog.zohdi.me';

const htmlFiles = (await readdir(DIST, { recursive: true })).filter((f) => f.endsWith('.html')).map((f) => join(DIST, f));
const pages = await Promise.all(htmlFiles.map(async (file) => ({ file, html: await readFile(file, 'utf8') })));
const problems = findBroken(pages, (p) => existsSync(join(DIST, p)), ORIGIN).map(({ file, ref }) => `${file}: broken link ${ref}`);

const draftsChecked = process.env.SHOW_DRAFTS !== '1';
if (draftsChecked) {
  const rss = await readFile(join(DIST, 'rss.xml'), 'utf8').catch(() => '');
  for (const { slug, data } of await readPosts('src/content/posts')) {
    if (!data.draft) continue;
    if (existsSync(join(DIST, slug))) problems.push(`draft "${slug}" was published to dist/${slug}/`);
    if (existsSync(join(DIST, 'og', `${slug}.png`))) problems.push(`draft "${slug}" has an OG image at dist/og/${slug}.png`);
    // Full URL, not a bare /<slug>/: post bodies in the feed can hold external links or tag paths.
    if (rss.includes(`${ORIGIN}/${slug}/`)) problems.push(`draft "${slug}" is listed in dist/rss.xml`);
  }
}

if (problems.length > 0) {
  console.error(`Built-site check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `Built-site check passed: ${pages.length} pages, no broken links${draftsChecked ? ', no drafts' : ' (draft check skipped: SHOW_DRAFTS=1)'}.`,
);
