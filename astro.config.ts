import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { transformerMetaHighlight, transformerNotationDiff } from '@shikijs/transformers';
import { blueprint } from './src/lib/shiki/blueprint';
import { transformerCodeFrame } from './src/lib/shiki/code-frame';

export default defineConfig({
  site: 'https://blog.zohdi.me',
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
