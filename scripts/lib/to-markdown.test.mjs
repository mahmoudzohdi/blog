import { describe, expect, it } from 'vitest';
import { devtoFrontmatter, toMarkdown } from './to-markdown.mjs';

const opts = { postUrl: 'https://blog.zohdi.me/p/?utm_source=devto', assetBase: 'https://raw.example/p' };

describe('toMarkdown', () => {
  it('drops imports and turns imported images into absolute figures', () => {
    const body = [
      "import { Figure } from '@/components/mdx';",
      "import shot from './shot.png';",
      '',
      '<Figure src={shot} alt="A shot" caption="The result." />',
    ].join('\n');
    expect(toMarkdown(body, opts)).toBe('![A shot](https://raw.example/p/shot.png)\n\n*The result.*\n');
  });

  it('turns a Callout into a labelled quote', () => {
    const body = '<Callout type="tip">\n\nUse a store.\n\nIt helps.\n\n</Callout>';
    expect(toMarkdown(body, opts)).toBe('> **Tip:** Use a store.\n>\n> It helps.\n');
  });

  it('keeps the list inside Steps and adds the caption', () => {
    const body = '<Steps highlight={2} caption="The flow.">\n\n1. One\n2. Two\n\n</Steps>';
    expect(toMarkdown(body, opts)).toBe('1. One\n2. Two\n\n*The flow.*\n');
  });

  it('links StackBlitz demos and replaces unknown components with a link back', () => {
    const body = '<StackBlitz id="abc" title="Live demo" />\n\n<Counter start={1} />';
    expect(toMarkdown(body, opts)).toBe(
      '[Live demo (StackBlitz)](https://stackblitz.com/edit/abc)\n\n[See the interactive version on blog.zohdi.me](https://blog.zohdi.me/p/?utm_source=devto)\n',
    );
  });

  it('makes relative markdown images absolute', () => {
    expect(toMarkdown('![Alt](./a.png)', opts)).toBe('![Alt](https://raw.example/p/a.png)\n');
  });

  it('cleans code fences but never touches code inside them', () => {
    const body = '```jsx title="App.jsx" {2}\nconst a = <Counter />\nb() // [!code ++]\n```';
    expect(toMarkdown(body, opts)).toBe('**App.jsx**\n\n```jsx\nconst a = <Counter />\nb()\n```\n');
  });
});

describe('devtoFrontmatter', () => {
  it('writes dev.to frontmatter with at most four alphanumeric tags', () => {
    const fm = devtoFrontmatter(
      { title: 'A "quoted" title', description: 'Desc', tags: ['vue', 'micro-frontends', 'css', 'a11y', 'extra'] },
      { canonical: 'https://blog.zohdi.me/p/', cover: 'https://blog.zohdi.me/og/p.png' },
    );
    expect(fm).toBe(
      [
        '---',
        'title: "A \\"quoted\\" title"',
        'published: false',
        'description: "Desc"',
        'tags: vue, microfrontends, css, a11y',
        'canonical_url: https://blog.zohdi.me/p/',
        'cover_image: https://blog.zohdi.me/og/p.png',
        '---',
        '',
      ].join('\n'),
    );
  });
});
