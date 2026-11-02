import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { transformerMetaHighlight, transformerNotationDiff } from '@shikijs/transformers';
import { SITE } from './src/lib/site';
import { blueprint } from './src/lib/shiki/blueprint';
import { transformerCodeFrame } from './src/lib/shiki/code-frame';

export default defineConfig({
  site: SITE.url,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [mdx(), sitemap({ filter: (page) => !page.endsWith('/404/') })],
  markdown: {
    shikiConfig: {
      theme: blueprint,
      transformers: [transformerMetaHighlight(), transformerNotationDiff(), transformerCodeFrame()],
    },
  },
});
