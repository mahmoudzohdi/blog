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
    expect(toMarkdown(body, opts)).toBe('**App.jsx**\n\n```diff\n const a = <Counter />\n+b()\n```\n');
  });

  it('leaves components inside inline code alone', () => {
    expect(toMarkdown('Use the `<Counter />` component to render it.', opts)).toBe('Use the `<Counter />` component to render it.\n');
  });

  it('still replaces an unknown component that wraps inline code', () => {
    expect(toMarkdown('<Tabs>\n\nRun `npm i` first.\n\n</Tabs>', opts)).toBe(
      '[See the interactive version on blog.zohdi.me](https://blog.zohdi.me/p/?utm_source=devto)\n',
    );
  });

  it('turns JSX space expressions into plain spaces', () => {
    expect(toMarkdown("Click [here](https://x){' '}to continue.", opts)).toBe('Click [here](https://x) to continue.\n');
    expect(toMarkdown('Click [here](https://x){" "}to continue.', opts)).toBe('Click [here](https://x) to continue.\n');
  });

  it('keeps indented fences inside list items intact', () => {
    const body = '1. Render it:\n\n   ```jsx\n   const el = <Counter start={1} />\n   ```';
    expect(toMarkdown(body, opts)).toBe(`${body}\n`);
  });

  it('keeps ~~~ fences, and longer fences that wrap shorter ones', () => {
    const tilde = '~~~jsx\nconst el = <Counter />\n~~~';
    expect(toMarkdown(tilde, opts)).toBe(`${tilde}\n`);
    const nested = '````md\n```jsx\n<Counter />\n```\n````';
    expect(toMarkdown(nested, opts)).toBe(`${nested}\n`);
  });

  it('never collapses blank lines inside code', () => {
    const body = '```py\na = 1\n\n\nb = 2\n```';
    expect(toMarkdown(body, opts)).toBe(`${body}\n`);
  });

  it('strips non-diff notation in any comment style and keeps the language', () => {
    expect(toMarkdown('```py\nx = 1  # [!code warning]\n```', opts)).toBe('```py\nx = 1\n```\n');
    expect(toMarkdown('```html\n<div>Oops</div> <!-- [!code warning] -->\n```', opts)).toBe('```html\n<div>Oops</div>\n```\n');
    expect(toMarkdown('```css\na { color: red; } /* [!code highlight] */\n```', opts)).toBe('```css\na { color: red; }\n```\n');
    expect(toMarkdown('```js\ntrack() // [!code word:track]\n```', opts)).toBe('```js\ntrack()\n```\n');
  });

  it('turns ++/-- notation into a diff block', () => {
    const body = [
      '```ts title="track.ts"',
      'export function track(name: string) {',
      '  window.umami.track(name) // [!code --]',
      '  window.umami?.track(name) // [!code ++]',
      '}',
      '```',
    ].join('\n');
    expect(toMarkdown(body, opts)).toBe(
      ['**track.ts**', '', '```diff', ' export function track(name: string) {', '-  window.umami.track(name)', '+  window.umami?.track(name)', ' }', '```', ''].join('\n'),
    );
  });

  it('puts diff markers after the indentation of an indented fence', () => {
    const body = '1. Change it:\n\n   ```js\n   a() // [!code --]\n   b() // [!code ++]\n   ```';
    expect(toMarkdown(body, opts)).toBe('1. Change it:\n\n   ```diff\n   -a()\n   +b()\n   ```\n');
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
