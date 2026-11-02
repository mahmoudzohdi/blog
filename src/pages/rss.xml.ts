import rss from '@astrojs/rss';
import { getContainerRenderer as getMDXRenderer } from '@astrojs/mdx/container-renderer';
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { render } from 'astro:content';
import { transform, walk } from 'ultrahtml';
import sanitize from 'ultrahtml/transformers/sanitize';
import { getPosts } from '../lib/posts';
import { SITE } from '../lib/site';
import { absoluteSrcset, absoluteUrl } from '../lib/urls';

export async function GET(context: APIContext) {
  const site = context.site ?? new URL(SITE.url);
  const container = await AstroContainer.create({ renderers: await loadRenderers([getMDXRenderer()]) });
  const items = [];

  for (const post of await getPosts()) {
    const { Content } = await render(post);
    const raw = (await container.renderToString(Content)).replace(/^<!DOCTYPE html>/i, '');
    const content = await transform(raw, [
      async (tree) => {
        await walk(tree, (node: any) => {
          const attrs = node.attributes as Record<string, string> | undefined;
          if (!attrs) return;
          for (const name of ['href', 'src']) if (typeof attrs[name] === 'string') attrs[name] = absoluteUrl(attrs[name], site);
          if (typeof attrs.srcset === 'string') attrs.srcset = absoluteSrcset(attrs.srcset, site);
        });
        return tree;
      },
      // Keep custom elements (StackBlitz link lives inside one); drop scripts, styles and buttons.
      sanitize({ dropElements: ['script', 'style', 'button'], allowCustomElements: true }),
    ]);
    items.push({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/${post.id}/`,
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
