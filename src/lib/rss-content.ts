import { ELEMENT_NODE, h, transform, walk } from 'ultrahtml';
import sanitize from 'ultrahtml/transformers/sanitize';
import { absoluteSrcset, absoluteUrl } from './urls';

/** Custom elements that read fine without JavaScript (the StackBlitz embed holds a plain "Open on StackBlitz" link). */
const STATIC_CUSTOM_ELEMENTS = new Set(['stackblitz-embed']);

/**
 * Turns a post's rendered HTML into feed-reader HTML: absolute URLs; no hidden elements, scripts,
 * styles or buttons; and a link back to the post in place of interactive custom elements.
 */
export async function rssContent(html: string, { site, postUrl }: { site: URL; postUrl: string }): Promise<string> {
  return transform(html, [
    async (tree) => {
      await walk(tree, (node: any) => {
        // Filter children before the walker visits them, so a hidden element goes with everything inside it.
        if (Array.isArray(node.children)) {
          node.children = node.children.filter((child: any) => !(child.type === ELEMENT_NODE && 'hidden' in child.attributes));
        }
        if (node.type === ELEMENT_NODE && node.name.includes('-') && !STATIC_CUSTOM_ELEMENTS.has(node.name)) {
          const link = h('a', { href: postUrl }, `See the interactive version on ${site.hostname}`);
          link.parent = node;
          node.name = 'p';
          node.attributes = {};
          node.children = [link];
        }
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
}
