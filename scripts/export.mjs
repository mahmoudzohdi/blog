import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseFrontmatter } from './lib/content.mjs';
import { devtoFrontmatter, toMarkdown } from './lib/to-markdown.mjs';

const SITE = 'https://blog.zohdi.me';
const RAW = 'https://raw.githubusercontent.com/mahmoudzohdi/blog/main/src/content/posts';
const PLATFORMS = ['devto', 'hashnode', 'medium'];

const [slug, platform = 'devto'] = process.argv.slice(2);
if (!slug || !PLATFORMS.includes(platform)) {
  console.error('Usage: npm run export -- <slug> [devto|hashnode|medium]');
  process.exit(1);
}

const source = await readFile(`src/content/posts/${slug}/index.mdx`, 'utf8');
const data = parseFrontmatter(source);
const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const canonical = `${SITE}/${slug}/`;
const tracked = `${canonical}?utm_source=${platform}`;

const head = platform === 'devto' ? devtoFrontmatter(data, { canonical, cover: `${SITE}/og/${slug}.png` }) : `# ${data.title}\n\n`;
const markdown = toMarkdown(body, { postUrl: tracked, assetBase: `${RAW}/${slug}` });
const footer = `\n---\n\n*Originally published on [blog.zohdi.me](${tracked}), where you can also leave a comment.*\n`;

await mkdir('export', { recursive: true });
const file = `export/${slug}.${platform}.md`;
await writeFile(file, head + markdown + footer);
console.log(`Wrote ${file}\nCanonical URL: ${canonical}`);
