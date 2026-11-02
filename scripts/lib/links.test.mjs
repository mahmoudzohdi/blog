import { describe, expect, it } from 'vitest';
import { candidates, findBroken, localRefs } from './links.mjs';

const ORIGIN = 'https://blog.zohdi.me';

describe('localRefs', () => {
  it('collects root-relative and same-site refs from href, src, srcset and content', () => {
    const html = `
      <a href="/tags/vue/">t</a><a href="https://example.com/x">e</a><a href="#top">h</a>
      <img src="/_astro/a.webp" srcset="/_astro/a-720.webp 720w, /_astro/a-1440.webp 1440w">
      <meta property="og:image" content="https://blog.zohdi.me/og/a.png">
      <a href="//cdn.example.com/x">p</a><a href="/rss.xml?x=1#y">r</a>`;
    expect(localRefs(html, ORIGIN).sort()).toEqual(
      ['/_astro/a-1440.webp', '/_astro/a-720.webp', '/_astro/a.webp', '/og/a.png', '/rss.xml', '/tags/vue/'].sort(),
    );
  });
});

describe('candidates', () => {
  it('maps directory URLs to index.html and files to themselves', () => {
    expect(candidates('/a/')).toEqual(['/a/index.html']);
    expect(candidates('/a.png')).toEqual(['/a.png', '/a.png/index.html', '/a.png.html']);
  });
});

describe('findBroken', () => {
  it('reports refs with no matching file', () => {
    const files = new Set(['/index.html', '/a/index.html']);
    const pages = [{ file: 'dist/index.html', html: '<a href="/a/">a</a><a href="/missing/">m</a>' }];
    expect(findBroken(pages, (p) => files.has(p), ORIGIN)).toEqual([{ file: 'dist/index.html', ref: '/missing/' }]);
  });
});
