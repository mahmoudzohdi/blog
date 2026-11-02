import rss from '@astrojs/rss';
import { getContainerRenderer as getMDXRenderer } from '@astrojs/mdx/container-renderer';
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { render } from 'astro:content';
import { getPosts } from '../lib/posts';
import { rssContent } from '../lib/rss-content';
import { SITE } from '../lib/site';
import { postPath } from '../lib/urls';

export async function GET(context: APIContext) {
  const site = context.site ?? new URL(SITE.url);
  const container = await AstroContainer.create({ renderers: await loadRenderers([getMDXRenderer()]) });
  const items = [];

  for (const post of await getPosts()) {
    const { Content } = await render(post);
    const raw = (await container.renderToString(Content)).replace(/^<!DOCTYPE html>/i, '');
    const content = await rssContent(raw, { site, postUrl: new URL(postPath(post.id), site).href });
    items.push({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postPath(post.id),
      categories: post.data.tags,
      content,
    });
  }

  return rss({
    title: SITE.title,
    description: SITE.description,
    site,
    items,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>en</language><atom:link href="${new URL('/rss.xml', site).href}" rel="self" type="application/rss+xml"/>`,
  });
}
