import { describe, expect, it } from 'vitest';
import { rssContent } from './rss-content';

const site = new URL('https://blog.zohdi.me');
const postUrl = 'https://blog.zohdi.me/showcase/';
const run = (html: string) => rssContent(html, { site, postUrl });

describe('rssContent', () => {
  it('makes root-relative URLs absolute', async () => {
    expect(await run('<img src="/_astro/a.webp" srcset="/_astro/a.webp 720w" alt="">')).toBe(
      '<img src="https://blog.zohdi.me/_astro/a.webp" srcset="https://blog.zohdi.me/_astro/a.webp 720w" alt="">',
    );
  });

  it('drops scripts, styles and buttons', async () => {
    expect(await run('<p>Text</p><script>x()</script><style>p{}</style><button>Copy</button>')).toBe('<p>Text</p>');
  });

  it('drops hidden elements with everything inside them, and keeps their siblings', async () => {
    const out = await run('<div><p hidden>one <b>inner</b></p><p>two</p><p hidden="">three</p><p>four</p></div>');
    expect(out).toBe('<div><p>two</p><p>four</p></div>');
  });

  it('replaces interactive custom elements with a link back to the post', async () => {
    expect(await run('<p>Before</p><copy-widget data-x="1"><span>Only works with JS</span></copy-widget>')).toBe(
      '<p>Before</p><p><a href="https://blog.zohdi.me/showcase/">See the interactive version on blog.zohdi.me</a></p>',
    );
  });

  it('keeps the StackBlitz embed and its link, without the load button or hidden note', async () => {
    const out = await run(
      '<stackblitz-embed class="demo"><p class="demo-title">Demo</p><div class="demo-actions"><button class="btn" type="button" data-load hidden>Load interactive demo</button> <a class="small-btn" href="https://stackblitz.com/edit/x">Open on StackBlitz</a></div><p class="demo-note" data-note hidden>Loading it here connects to stackblitz.com.</p></stackblitz-embed>',
    );
    expect(out).toContain('<stackblitz-embed class="demo">');
    expect(out).toContain('<a class="small-btn" href="https://stackblitz.com/edit/x">Open on StackBlitz</a>');
    expect(out).not.toContain('Load interactive demo');
    expect(out).not.toContain('Loading it here connects to stackblitz.com.');
    expect(out).not.toContain('See the interactive version');
  });
});
