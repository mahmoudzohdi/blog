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

/** Reads every <dir>/<slug>/index.mdx, e.g. src/content/posts/<slug>/index.mdx. */
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

/**
 * Reads src/content/posts (published unless draft) and src/content/fixtures (test-only, loaded
 * with BLOG_FIXTURES=1 and never published).
 */
export async function readContent(root = 'src/content') {
  const [posts, fixtures] = await Promise.all([readPosts(join(root, 'posts')), readPosts(join(root, 'fixtures'))]);
  return { posts, fixtures };
}

/** Posts and fixtures share one collection, so slugs and thread ids must be unique across both. */
export function findProblems(posts, fixtures = []) {
  const problems = [];
  const slugs = new Map();
  const threads = new Map();
  const entries = [
    ...posts.map((p) => ({ ...p, name: p.slug })),
    ...fixtures.map((p) => ({ ...p, name: `fixtures/${p.slug}` })),
  ];
  for (const { slug, name, data } of entries) {
    if (RESERVED_SLUGS.includes(slug)) problems.push(`${name}: slug is reserved`);
    else if (!/^[a-z0-9-]+$/.test(slug)) problems.push(`${name}: slug must be lowercase letters, digits and dashes`);
    else if (slugs.has(slug)) problems.push(`${name}: slug is also used by ${slugs.get(slug)}`);
    else slugs.set(slug, name);
    const id = data.threadId;
    if (!id) continue;
    if (threads.has(id)) problems.push(`${name}: threadId "${id}" is also used by ${threads.get(id)}`);
    else threads.set(id, name);
  }
  return problems;
}

/** Entries that must never appear in dist/: draft posts and every fixture. */
export function unpublished(posts, fixtures) {
  return [
    ...posts.filter((p) => p.data.draft).map(({ slug }) => ({ slug, kind: 'draft' })),
    ...fixtures.map(({ slug }) => ({ slug, kind: 'fixture' })),
  ];
}

/** Reads an elsewhere list (src/content/elsewhere.yaml, or its test-only copy in fixtures/). `[]` or no entries gives []. */
export async function readElsewhere(file) {
  const data = parse(await readFile(file, 'utf8')) ?? [];
  if (!Array.isArray(data)) throw new Error(`${file}: expected a list of entries`);
  return data;
}

// Astro escapes these in text and attributes, so a built page may hold the escaped form.
const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Built files ({ file, text }) that contain an entry's url or title, raw or HTML-escaped: [{ file, id }]. */
export function elsewhereLeaks(files, entries) {
  const leaks = [];
  for (const { id, url, title } of entries) {
    const needles = [url, title].filter(Boolean).flatMap((s) => [s, escapeHtml(s)]);
    for (const { file, text } of files) if (needles.some((n) => text.includes(n))) leaks.push({ file, id });
  }
  return leaks;
}
