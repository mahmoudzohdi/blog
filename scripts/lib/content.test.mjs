import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findProblems, parseFrontmatter, readContent, readPosts, unpublished } from './content.mjs';

describe('parseFrontmatter', () => {
  it('reads YAML between the first two --- lines', () => {
    expect(parseFrontmatter('---\ntitle: Hi\ndraft: true\n---\nBody')).toEqual({ title: 'Hi', draft: true });
  });

  it('throws when there is no frontmatter', () => {
    expect(() => parseFrontmatter('# Just text')).toThrow('missing frontmatter');
  });
});

describe('readPosts', () => {
  it('names the post folder when its index.mdx is missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'posts-'));
    try {
      await mkdir(join(dir, 'a'));
      await writeFile(join(dir, 'a', 'index.mdx'), '---\nthreadId: a\n---\nBody');
      await mkdir(join(dir, 'b'));
      // Anchored: Node's own ENOENT message already contains the full path.
      await expect(readPosts(dir)).rejects.toThrow(/^b\/index\.mdx: /);
      await expect(readPosts(dir)).rejects.toMatchObject({ cause: { code: 'ENOENT' } });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('readContent', () => {
  it('reads posts and fixtures from their own folders', async () => {
    const root = await mkdtemp(join(tmpdir(), 'content-'));
    try {
      await mkdir(join(root, 'posts', 'a'), { recursive: true });
      await writeFile(join(root, 'posts', 'a', 'index.mdx'), '---\nthreadId: a\n---\nBody');
      await writeFile(join(root, 'posts', '.gitkeep'), '');
      await mkdir(join(root, 'fixtures', 'f'), { recursive: true });
      await writeFile(join(root, 'fixtures', 'f', 'index.mdx'), '---\nthreadId: f\n---\nBody');
      expect(await readContent(root)).toEqual({
        posts: [{ slug: 'a', data: { threadId: 'a' } }],
        fixtures: [{ slug: 'f', data: { threadId: 'f' } }],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('findProblems', () => {
  it('accepts unique slugs and thread ids', () => {
    expect(findProblems([{ slug: 'a', data: { threadId: 'a' } }, { slug: 'b', data: { threadId: 'b' } }])).toEqual([]);
  });

  it('reports a duplicate threadId', () => {
    expect(findProblems([{ slug: 'a', data: { threadId: 'x' } }, { slug: 'b', data: { threadId: 'x' } }])).toEqual([
      'b: threadId "x" is also used by a',
    ]);
  });

  it('reports reserved and badly formed slugs', () => {
    expect(findProblems([{ slug: 'tags', data: { threadId: 't' } }, { slug: 'My_Post', data: { threadId: 'm' } }])).toEqual([
      'tags: slug is reserved',
      'My_Post: slug must be lowercase letters, digits and dashes',
    ]);
  });

  it('checks fixtures too, naming them by folder', () => {
    const posts = [{ slug: 'a', data: { threadId: 'x' } }];
    const fixtures = [
      { slug: 'b', data: { threadId: 'x' } },
      { slug: 'tags', data: { threadId: 't' } },
      { slug: 'My_Fixture', data: { threadId: 'm' } },
    ];
    expect(findProblems(posts, fixtures)).toEqual([
      'fixtures/b: threadId "x" is also used by a',
      'fixtures/tags: slug is reserved',
      'fixtures/My_Fixture: slug must be lowercase letters, digits and dashes',
    ]);
  });

  it('reports a fixture slug that a post already uses', () => {
    expect(findProblems([{ slug: 'a', data: { threadId: 'a' } }], [{ slug: 'a', data: { threadId: 'b' } }])).toEqual([
      'fixtures/a: slug is also used by a',
    ]);
  });
});

describe('unpublished', () => {
  it('lists drafts and every fixture, not published posts', () => {
    const posts = [
      { slug: 'live', data: { draft: false } },
      { slug: 'wip', data: { draft: true } },
      { slug: 'plain', data: {} },
    ];
    const fixtures = [{ slug: 'showcase', data: { draft: true } }, { slug: 'other', data: {} }];
    expect(unpublished(posts, fixtures)).toEqual([
      { slug: 'wip', kind: 'draft' },
      { slug: 'showcase', kind: 'fixture' },
      { slug: 'other', kind: 'fixture' },
    ]);
  });
});
