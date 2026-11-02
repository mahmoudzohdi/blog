import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseFrontmatter } from './lib/content.mjs';
import { coverUrl, devtoFrontmatter, toMarkdown } from './lib/to-markdown.mjs';

const SITE = 'https://blog.zohdi.me'; // keep in sync with src/lib/site.ts SITE.url
const RAW = 'https://raw.githubusercontent.com/mahmoudzohdi/blog/main/src/content/posts';
const PLATFORMS = ['devto', 'hashnode', 'medium'];

const [slug, platform = 'devto'] = process.argv.slice(2);
if (!slug || !PLATFORMS.includes(platform)) {
  console.error('Usage: npm run export -- <slug> [devto|hashnode|medium]');
  process.exit(1);
}

const path = `src/content/posts/${slug}/index.mdx`;
let source;
try {
  source = await readFile(path, 'utf8');
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
  console.error(`No post at ${path}`);
  process.exit(1);
}
const data = parseFrontmatter(source);
if (data.draft === true) {
  console.error(`Warning: ${slug} is a draft; its OG image and canonical URL won't exist until it is published.`);
}
const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const canonical = `${SITE}/${slug}/`;
const tracked = `${canonical}?utm_source=${platform}`;

const assetBase = `${RAW}/${slug}`;
const cover = coverUrl(data.cover, { assetBase, og: `${SITE}/og/${slug}.png` });
const head = platform === 'devto' ? devtoFrontmatter(data, { canonical, cover }) : `# ${data.title}\n\n`;
const markdown = toMarkdown(body, { postUrl: tracked, assetBase });
const footer = `\n---\n\n*Originally published on [blog.zohdi.me](${tracked}), where you can also leave a comment.*\n`;

await mkdir('export', { recursive: true });
const file = `export/${slug}.${platform}.md`;
await writeFile(file, head + markdown + footer);
console.log(`Wrote ${file}\nCanonical URL: ${canonical}`);
