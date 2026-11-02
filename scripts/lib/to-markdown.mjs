const LABELS = { note: 'Note', tip: 'Tip', warning: 'Warning' };

/** Reads attr="value" or attr={value} from a JSX tag's attribute string. */
function attr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}=(?:"([^"]*)"|\\{([^}]*)\\})`));
  return m ? (m[1] ?? m[2]) : undefined;
}

/** Applies fn to text outside fenced code blocks, and code to the fences themselves. */
function splitByFences(source, text, code) {
  return source
    .split(/(^```[^\n]*\n[\s\S]*?^```[ \t]*$)/m)
    .map((part, i) => (i % 2 === 1 ? code(part) : text(part)))
    .join('');
}

function cleanFence(block) {
  const [first, ...rest] = block.split('\n');
  const lang = first.match(/^```(\S*)/)?.[1] ?? '';
  const title = first.match(/title="([^"]+)"/)?.[1];
  const body = rest.join('\n').replace(/[ \t]*\/\/ \[!code (?:\+\+|--|highlight|focus)\]/g, '');
  return `${title ? `**${title}**\n\n` : ''}\`\`\`${lang}\n${body}`;
}

/** Converts a post's MDX body into plain Markdown for dev.to, Hashnode and Medium. */
export function toMarkdown(body, { postUrl, assetBase }) {
  const images = {};
  const linkBack = `[See the interactive version on blog.zohdi.me](${postUrl})`;

  const text = (part) => {
    let out = part.replace(/^import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"];?[ \t]*$/gm, (_, name, path) => {
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
    return out;
  };

  return `${splitByFences(body, text, cleanFence).replace(/\n{3,}/g, '\n\n').trim()}\n`;
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
