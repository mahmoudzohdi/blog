import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const slugLike = /^[a-z0-9-]+$/;

const posts = defineCollection({
  // One folder per post: src/content/posts/<slug>/index.mdx → entry id "<slug>"
  loader: glob({ pattern: '*/index.mdx', base: './src/content/posts' }),
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
  loader: file('src/content/elsewhere.yaml'),
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
