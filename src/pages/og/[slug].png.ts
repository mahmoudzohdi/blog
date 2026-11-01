import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { APIRoute, GetStaticPaths } from 'astro';
import satori from 'satori';
import { getPosts } from '../../lib/posts';

// Paths are relative to the project root: endpoints are bundled, so import.meta.url is not stable.
const font = (path: string) => readFile(join(process.cwd(), 'node_modules', path));
const [display, text] = await Promise.all([
  font('@fontsource/alexandria/files/alexandria-latin-600-normal.woff'),
  font('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff'),
]);
const logo = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1d3db0"/><polygon fill="#fff" points="17,15 47,15 47,22 28,42 47,42 47,49 17,49 17,42 36,22 17,22"/></svg>',
).toString('base64')}`;

export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return [
    { params: { slug: 'home' }, props: { title: 'Notes from building for the web' } },
    ...posts.map((p) => ({ params: { slug: p.id }, props: { title: p.data.title } })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { title } = props as { title: string };
  const size = title.length > 70 ? 54 : title.length > 40 ? 62 : 72;
  const node = {
    type: 'div',
    props: {
      // satori defaults to content-box: without border-box, padding and the border push the bottom row off the canvas.
      style: {
        boxSizing: 'border-box', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '64px 80px 72px', background: '#eef0f3', color: '#23272e', borderTop: '14px solid #1d3db0',
      },
      children: [
        { type: 'div', props: { style: { display: 'flex', alignItems: 'center', gap: 20 }, children: [
          { type: 'img', props: { src: logo, width: 64, height: 64 } },
          { type: 'div', props: { style: { fontFamily: 'Alexandria', fontWeight: 600, fontSize: 34 }, children: 'Zohdi blog' } },
        ] } },
        { type: 'div', props: { style: { display: 'flex', fontFamily: 'Alexandria', fontWeight: 600, fontSize: size, lineHeight: 1.12, letterSpacing: '-0.01em', maxWidth: 1040 }, children: title } },
        { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', fontFamily: 'IBM Plex Sans', fontWeight: 500, fontSize: 28, color: '#5a6372' }, children: [
          { type: 'div', props: { children: 'Mahmoud Zohdi' } },
          { type: 'div', props: { children: 'blog.zohdi.me' } },
        ] } },
      ],
    },
  };
  const svg = await satori(node as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Alexandria', data: display, weight: 600, style: 'normal' },
      { name: 'IBM Plex Sans', data: text, weight: 500, style: 'normal' },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
