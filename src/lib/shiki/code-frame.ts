import type { Element, ElementContent } from 'hast';
import type { ShikiTransformer } from 'shiki';

const NAMES: Record<string, string> = {
  js: 'JavaScript', javascript: 'JavaScript', jsx: 'JSX', ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX',
  vue: 'Vue', html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON', jsonc: 'JSON', yaml: 'YAML', yml: 'YAML',
  bash: 'Shell', sh: 'Shell', shell: 'Shell', zsh: 'Shell', md: 'Markdown', mdx: 'MDX', diff: 'Diff', php: 'PHP', sql: 'SQL',
  astro: 'Astro', txt: 'Text', text: 'Text', plaintext: 'Text',
};

export const languageName = (lang: string): string => NAMES[lang] ?? lang;

const titleOf = (raw?: string): string | undefined => {
  const m = raw?.match(/title=(?:"([^"]*)"|'([^']*)'|(\S+))/);
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
};

const el = (tagName: string, properties: Element['properties'], children: ElementContent[] = []): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const text = (value: string): ElementContent => ({ type: 'text', value });

/**
 * Wraps each highlighted block in <figure class="code-block"> with a header bar:
 * optional title (from `title="…"` in the fence meta), language name and a copy button.
 * Astro keeps only the root's first child, so the figure must be the single root child.
 */
export function transformerCodeFrame(): ShikiTransformer {
  return {
    name: 'zohdi:code-frame',
    root(root) {
      const pre = root.children.find((n): n is Element => n.type === 'element' && n.tagName === 'pre');
      if (!pre) return;
      const lang = this.options.lang;
      const title = titleOf(this.options.meta?.__raw);
      const parts = [
        ...(title ? [el('span', { className: ['code-title'] }, [text(title)])] : []),
        el('span', { className: ['code-lang'] }, [text(languageName(lang))]),
        el('button', { type: 'button', className: ['code-copy'], ariaLabel: 'Copy code' }, [
          el('span', { dataLabel: '' }, [text('Copy')]),
        ]),
      ];
      // Spaces between the parts so they don't run together for assistive tech and copy/paste
      const header = el('div', { className: ['code-header'] }, parts.flatMap((p, i) => (i ? [text(' '), p] : [p])));
      root.children = [el('figure', { className: ['code-block'], dataLang: lang }, [header, pre])];
    },
  };
}
