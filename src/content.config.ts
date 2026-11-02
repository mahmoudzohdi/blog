import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const slugLike = /^[a-z0-9-]+$/;

// With BLOG_FIXTURES=1 (test builds, `npm run dev:showcase`) posts also load src/content/fixtures/*/index.mdx
// and elsewhere loads src/content/fixtures/elsewhere.yaml. Fixtures never reach `npm run dev` or production;
// scripts/check-dist.mjs refuses a BLOG_FIXTURES build and fails if a fixture reaches dist/.
const withFixtures = process.env.BLOG_FIXTURES === '1';

const posts = defineCollection({
  // One folder per post or fixture: src/content/{posts,fixtures}/<slug>/index.mdx → entry id "<slug>"
  loader: glob({
    base: './src/content',
    pattern: withFixtures ? ['posts/*/index.mdx', 'fixtures/*/index.mdx'] : 'posts/*/index.mdx',
    generateId: ({ entry }) => entry.split('/')[1], // "posts/<slug>/index.mdx" → "<slug>"
  }),
  schema: ({ image }) =>
    z.strictObject({
      title: z.string().min(1),
      description: z.string().min(1).max(160),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string().regex(slugLike)).min(1).max(6),
      threadId: z.string().regex(slugLike),
      draft: z.boolean().default(false),
      cover: image().optional(),
      discuss: z.strictObject({ devto: z.url().optional(), linkedin: z.url().optional() }).optional(),
    }),
});

const elsewhere = defineCollection({
  // file() reads a single file (and clears the collection on each read), so a fixtures build swaps
  // the real list for the test-only one instead of merging the two. That keeps the e2e data fixed
  // whatever real entries exist, and fixture ids can never clash with real ones.
  loader: file(withFixtures ? 'src/content/fixtures/elsewhere.yaml' : 'src/content/elsewhere.yaml'),
  schema: z.strictObject({
    id: z.string().optional(),
    title: z.string().min(1),
    url: z.url(),
    date: z.coerce.date(),
    kind: z.enum(['article', 'talk']),
    where: z.string().min(1),
    description: z.string().optional(),
    tags: z.array(z.string().regex(slugLike)).min(1),
  }),
});

export const collections = { posts, elsewhere };
