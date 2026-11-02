const LABELS = { note: 'Note', tip: 'Tip', warning: 'Warning' };

/** Reads attr="value" or attr={value} from a JSX tag's attribute string. */
function attr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}=(?:"([^"]*)"|\\{([^}]*)\\})`));
  return m ? (m[1] ?? m[2]) : undefined;
}

/**
 * A fenced code block: ``` or ~~~ (three or more), optionally indented (inside a list item).
 * It closes on a line with the same fence character, at least as long, so a ```` fence can show ``` examples.
 */
const FENCE = /^([ \t]*)((`|~)\3{2,})[^\n]*\n[\s\S]*?^[ \t]*\2\3*[ \t]*$/gm;

/** A Shiki notation comment at the end of a line, in any comment style: `// [!code ++]`, `# [!code warning]`, `<!-- [!code focus] -->`, `[!code word:x]`. */
const NOTATION = /[ \t]*(?:\/\/|#|\/\*|<!--)\s*\[!code ([a-z+-]+)(?:[:|][^\]]*)?\]\s*(?:\*\/|-->)?[ \t]*$/;

const DIFF_MARKS = { '++': '+', '--': '-' };

/** Applies text to everything outside fenced code blocks, and code to the fences themselves. */
function splitByFences(source, text, code) {
  let out = '';
  let last = 0;
  for (const m of source.matchAll(FENCE)) {
    out += text(source.slice(last, m.index)) + code(m[0]);
    last = m.index + m[0].length;
  }
  return out + text(source.slice(last));
}

/** Runs fn with single-line inline code spans masked, so prose transforms never rewrite `<Example />` in backticks. */
function protectInlineCode(source, fn) {
  const spans = [];
  const masked = source.replace(/`[^`\n]+`/g, (span) => `\u0000${spans.push(span) - 1}\u0000`);
  return fn(masked).replace(/\u0000(\d+)\u0000/g, (_, i) => spans[i]);
}

/** Drops the title/line-highlight meta and Shiki notation; ++/-- notation turns the block into a diff. */
function cleanFence(block) {
  const lines = block.split('\n');
  const closing = lines.pop();
  const [open, ...content] = lines;
  const [, indent, fence, lang] = open.match(/^([ \t]*)(`{3,}|~{3,})(\S*)/);
  const title = open.match(/title="([^"]+)"/)?.[1];

  const marks = content.map((line) => line.match(NOTATION)?.[1]);
  const code = content.map((line) => line.replace(NOTATION, ''));
  const isDiff = marks.some((mark) => mark in DIFF_MARKS);
  const body = isDiff
    ? code.map((line, i) => {
        const rest = line.startsWith(indent) ? line.slice(indent.length) : line.trimStart();
        return `${indent}${DIFF_MARKS[marks[i]] ?? ' '}${rest}`;
      })
    : code;

  const heading = title ? `${indent}**${title}**\n\n` : '';
  return heading + [`${indent}${fence}${isDiff ? 'diff' : lang}`, ...body, closing].join('\n');
}

/** Converts a post's MDX body into plain Markdown for dev.to, Hashnode and Medium. */
export function toMarkdown(body, { postUrl, assetBase }) {
  const images = {};
  const linkBack = `[See the interactive version on blog.zohdi.me](${postUrl})`;

  const prose = (part) => {
    let out = part.replace(/\{(['"]) \1\}/g, ' ');
    out = out.replace(/^import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"];?[ \t]*$/gm, (_, name, path) => {
      images[name] = `${assetBase}/${path}`;
      return '';
    });
    out = out.replace(/^import\s.*$/gm, '');
    out = out.replace(/<Callout(?:\s+type="(\w+)")?\s*>([\s\S]*?)<\/Callout>/g, (_, type = 'note', inner) => {
      const lines = inner.trim().split('\n');
      lines[0] = `**${LABELS[type] ?? 'Note'}:** ${lines[0]}`;
      return lines.map((l) => (l.trim() ? `> ${l}` : '>')).join('\n');
    });
    out = out.replace(/<Steps([^>]*)>([\s\S]*?)<\/Steps>/g, (_, attrs, inner) => {
      const caption = attr(attrs, 'caption');
      return `${inner.trim()}${caption ? `\n\n*${caption}*` : ''}`;
    });
    out = out.replace(/<Figure([^>]*?)\/>/g, (_, attrs) => {
      const src = attr(attrs, 'src');
      const caption = attr(attrs, 'caption');
      return `![${attr(attrs, 'alt') ?? ''}](${images[src] ?? src})${caption ? `\n\n*${caption}*` : ''}`;
    });
    out = out.replace(/<StackBlitz([^>]*?)\/>/g, (_, attrs) => `[${attr(attrs, 'title') ?? 'Interactive demo'} (StackBlitz)](https://stackblitz.com/edit/${attr(attrs, 'id')})`);
    out = out.replace(/<([A-Z]\w*)[^>]*?\/>/g, linkBack);
    out = out.replace(/<([A-Z]\w*)[^>]*>[\s\S]*?<\/\1>/g, linkBack);
    out = out.replace(/!\[([^\]]*)\]\(\.\/([^)\s]+)\)/g, (_, alt, path) => `![${alt}](${assetBase}/${path})`);
    return out.replace(/\n{3,}/g, '\n\n');
  };
  const text = (part) => protectInlineCode(part, prose);

  return `${splitByFences(body, text, cleanFence).trim()}\n`;
}

/** Cover for cross-posts: the post's own `cover` file (relative to the post folder) if set, otherwise the generated OG image. */
export function coverUrl(cover, { assetBase, og }) {
  return cover ? new URL(cover, `${assetBase}/`).href : og;
}

/** dev.to frontmatter: canonical URL back to the blog, up to four alphanumeric tags, unpublished draft. */
export function devtoFrontmatter(data, { canonical, cover }) {
  const tags = data.tags.map((t) => t.replace(/[^a-z0-9]/gi, '').toLowerCase()).filter(Boolean).slice(0, 4);
  return [
    '---',
    `title: ${JSON.stringify(data.title)}`,
    'published: false',
    `description: ${JSON.stringify(data.description)}`,
    `tags: ${tags.join(', ')}`,
    `canonical_url: ${canonical}`,
    `cover_image: ${cover}`,
    '---',
    '',
  ].join('\n');
}
