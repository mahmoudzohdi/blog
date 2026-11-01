import { getCollection } from 'astro:content';

/** Drafts show in `astro dev` and in test builds (SHOW_DRAFTS=1), never in production builds. */
export const showDrafts = import.meta.env.DEV || process.env.SHOW_DRAFTS === '1';

/** Visible posts, newest first. */
export async function getPosts() {
  const posts = await getCollection('posts', (p) => showDrafts || !p.data.draft);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export const getElsewhere = () => getCollection('elsewhere');
