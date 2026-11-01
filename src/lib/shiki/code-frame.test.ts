import { codeToHtml } from 'shiki';
import { transformerMetaHighlight, transformerNotationDiff } from '@shikijs/transformers';
import { describe, expect, it } from 'vitest';
import { blueprint } from './blueprint';
import { languageName, transformerCodeFrame } from './code-frame';

const render = (code: string, lang: string, meta?: string) =>
  codeToHtml(code, {
    lang,
    theme: blueprint,
    meta: meta ? { __raw: meta } : undefined,
    transformers: [transformerMetaHighlight(), transformerNotationDiff(), transformerCodeFrame()],
  });

describe('transformerCodeFrame', () => {
  it('wraps the code in a figure with title, language and copy button', async () => {
    const html = await render('const a = 1\nconst b = 2', 'js', 'title="src/a.js" {2}');
    expect(html.startsWith('<figure class="code-block" data-lang="js">')).toBe(true);
    expect(html).toContain('<span class="code-title">src/a.js</span>');
    expect(html).toContain('<span class="code-lang">JavaScript</span>');
    expect(html).toContain('<span class="code-title">src/a.js</span> <span class="code-lang">JavaScript</span> <button');
    expect(html).toContain('<button type="button" class="code-copy" aria-label="Copy code"><span data-label="">Copy</span></button>');
    expect(html).toMatch(/<span class="line highlighted">/);
  });

  it('works without a title', async () => {
    const html = await render('npm run build', 'bash');
    expect(html).not.toContain('code-title');
    expect(html).toContain('<span class="code-lang">Shell</span>');
  });

  it('keeps diff classes from the notation transformer', async () => {
    const html = await render('a() // [!code --]\nb() // [!code ++]', 'js');
    expect(html).toContain('line diff remove');
    expect(html).toContain('line diff add');
  });
});

describe('languageName', () => {
  it('names common languages and falls back to the id', () => {
    expect(languageName('ts')).toBe('TypeScript');
    expect(languageName('zig')).toBe('zig');
  });
});
