import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';

/** Slugs that would collide with site routes. */
export const RESERVED_SLUGS = ['tags', 'og', 'home', '404', 'giscus', 'rss.xml'];

export function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing frontmatter');
  return parse(match[1]) ?? {};
}

/** Reads every src/content/posts/<slug>/index.mdx. */
export async function readPosts(dir) {
  const folders = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  return Promise.all(
    folders.map(async (slug) => {
      try {
        return { slug, data: parseFrontmatter(await readFile(join(dir, slug, 'index.mdx'), 'utf8')) };
      } catch (err) {
        throw new Error(`${slug}/index.mdx: ${err.message}`, { cause: err });
      }
    }),
  );
}

export function findProblems(posts) {
  const problems = [];
  const threads = new Map();
  for (const { slug, data } of posts) {
    if (RESERVED_SLUGS.includes(slug)) problems.push(`${slug}: slug is reserved`);
    else if (!/^[a-z0-9-]+$/.test(slug)) problems.push(`${slug}: slug must be lowercase letters, digits and dashes`);
    const id = data.threadId;
    if (!id) continue;
    if (threads.has(id)) problems.push(`${slug}: threadId "${id}" is also used by ${threads.get(id)}`);
    else threads.set(id, slug);
  }
  return problems;
}
