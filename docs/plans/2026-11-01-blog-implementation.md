# blog.zohdi.me Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the self-hosted blog at `blog.zohdi.me` described in `docs/plans/2026-11-01-blog-design.md`, matching `docs/plans/2026-11-01-blog-mockup.html`, and launch it on a static Cloudflare Worker.

**Architecture:** Astro 7 static site. Posts are MDX in a content collection (one folder per post, images beside it); talks and older writing come from one YAML file. Shiki colours code at build with the talks "blueprint" theme plus a small transformer that adds the filename bar and copy button. All interactivity is vanilla TypeScript (custom elements and small scripts). Output in `dist/` is served by a Cloudflare Worker with static assets only, deployed by Workers Builds on push to `main`.

**Tech Stack:** Astro 7.4, @astrojs/mdx 8, @astrojs/rss, @astrojs/sitemap, Shiki 4 + @shikijs/transformers, satori + @resvg/resvg-js (OG images), ultrahtml (RSS HTML), @fontsource (Alexandria, IBM Plex Sans/Mono), Vitest 5, Playwright 1.64 + @axe-core/playwright, Wrangler 4, Node 24.

---

## Ground rules (read before Task 1)

- Repo: this folder (a git repo on `main`). Never commit to another repo. Never push until Task 26.
- Every commit message ends with a blank line and `Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK`.
- **Astro 7 whitespace:** `compressHTML` defaults to `'jsx'`, which drops whitespace between elements written on separate lines. Keep a sentence and its inline links/elements on one line, or add `{' '}`.
- **Astro 7 Markdown:** the default processor (Sätteri) runs no remark plugins. Do not add remark plugins; reading time is computed from `entry.body`.
- Imports inside `src/**/*.ts` omit file extensions (Astro's TS config uses bundler resolution). Node scripts in `scripts/` are plain `.mjs` with explicit extensions.
- Public-facing actions (pushing, creating the GitHub repo, deploying, DNS, editing zohdi.me) only happen in Tasks 26–31 and each one needs the user's explicit OK first.
- Reference for every visual detail: `docs/plans/2026-11-01-blog-mockup.html`. Open it in a browser next to `npm run dev` while working on Tasks 7–15.

---

### Task 1: Scaffold the Astro project

**Files:**
- Create: `.node-version`, `.gitignore`, `package.json`, `tsconfig.json`, `astro.config.ts`, `src/pages/index.astro`

**Step 1: Create the project files and install dependencies**

```bash
echo 24 > .node-version
cat > .gitignore <<'EOF'
node_modules/
dist/
.astro/
.wrangler/
export/
test-results/
playwright-report/
.DS_Store
EOF
npm init -y >/dev/null
npm install -D astro@^7.4.4 @astrojs/mdx@^8.1.2 @astrojs/sitemap@^3.7.4 @astrojs/rss@^4.0.19 @astrojs/check@^0.9.12 typescript@6.0.3 @types/node @types/hast
npm install -D shiki@^4.5.0 @shikijs/transformers@^4.5.0 satori@^0.63.2 @resvg/resvg-js@^2.6.2 ultrahtml@^1.7.0 yaml@^2.9.1
npm install -D @fontsource/alexandria@^5.3.0 @fontsource/ibm-plex-sans@^5.3.0 @fontsource/ibm-plex-mono@^5.3.0
npm install -D vitest@^5.0.5 @playwright/test@^1.64.1 @axe-core/playwright@^4.14.0 wrangler@^4.156.0
```

Note: `typescript` is pinned to 6.0.3 because `@astrojs/check` 0.9.12 does not accept TypeScript 7 yet.

**Step 2: Replace the generated top of `package.json`**

Keep the `devDependencies` npm wrote; set everything else to:

```json
{
  "name": "blog",
  "private": true,
  "type": "module",
  "description": "Mahmoud Zohdi's blog at blog.zohdi.me, built with Astro.",
  "scripts": {
    "dev": "astro dev",
    "check:content": "node scripts/check-content.mjs",
    "check:dist": "node scripts/check-dist.mjs",
    "test": "vitest run",
    "build": "npm run check:content && astro check && vitest run && astro build && npm run check:dist",
    "build:test": "SHOW_DRAFTS=1 astro build",
    "preview": "astro preview",
    "test:e2e": "playwright test",
    "export": "node scripts/export.mjs",
    "deploy": "npm run build && wrangler deploy"
  }
}
```

(`check:content`, `check:dist` and `export` scripts are created in Tasks 18–20. Until then use `npx astro build` directly.)

**Step 3: `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "export", "node_modules"]
}
```

**Step 4: Minimal `astro.config.ts`**

```ts
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://blog.zohdi.me',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [mdx(), sitemap()],
});
```

**Step 5: Placeholder `src/pages/index.astro`**

```astro
---
---
<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>blog</title></head><body><h1>blog</h1></body></html>
```

**Step 6: Build**

Run: `npx astro build`
Expected: finishes without errors; `dist/index.html` exists.

**Step 7: Commit**

```bash
git add -A
git commit -m "Scaffold Astro 7 project" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 2: Site constants and small browser helpers

**Files:**
- Create: `src/lib/site.ts`, `src/lib/track.ts`, `src/lib/copy.ts`, `vitest.config.ts`

**Step 1: `src/lib/site.ts`**

```ts
export const SITE = {
  url: 'https://blog.zohdi.me',
  title: 'Zohdi blog',
  description: 'Notes from building for the web, by Mahmoud Zohdi.',
  author: 'Mahmoud Zohdi',
  personId: 'https://zohdi.me/#person',
  links: {
    home: 'https://zohdi.me/',
    github: 'https://github.com/mahmoudzohdi',
    linkedin: 'https://www.linkedin.com/in/mahmoudzohdi/',
    repo: 'https://github.com/mahmoudzohdi/blog',
  },
};

/** Filled in at launch (Task 27). Comments stay off while repoId or categoryId is empty. */
export const GISCUS: { repo: string; repoId: string; category: string; categoryId: string } = {
  repo: 'mahmoudzohdi/blog',
  repoId: '',
  category: 'Comments',
  categoryId: '',
};

/** Filled in at launch (Task 28). No analytics script is rendered while this is empty. */
export const UMAMI_WEBSITE_ID: string = '';
```

**Step 2: `src/lib/track.ts`**

```ts
declare global {
  interface Window {
    umami?: { track: (name: string, data?: Record<string, string | number>) => void };
  }
}

/** Sends an Umami event. Does nothing when Umami is blocked or not configured. */
export function track(name: string, data?: Record<string, string | number>): void {
  try {
    window.umami?.track(name, data);
  } catch {
    // blocked by an extension or not loaded yet
  }
}
```

**Step 3: `src/lib/copy.ts`**

```ts
/** Copies text to the clipboard. Returns false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Shows a short confirmation on a button, then restores its label. */
export function flash(button: HTMLElement, label: string, ms = 1600): void {
  const target = button.querySelector<HTMLElement>('[data-label]') ?? button;
  const original = target.dataset.original ?? target.textContent ?? '';
  target.dataset.original = original;
  target.textContent = label;
  button.classList.add('done');
  window.setTimeout(() => {
    target.textContent = original;
    button.classList.remove('done');
  }, ms);
}
```

**Step 4: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] },
});
```

**Step 5: Commit**

```bash
git add -A
git commit -m "Add site constants, tracking and clipboard helpers" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 3: Date formatting (TDD)

**Files:**
- Create: `src/lib/dates.test.ts`, `src/lib/dates.ts`

**Step 1: Write the failing test** — `src/lib/dates.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { formatDate, formatDayMonth, isoDate } from './dates';

describe('dates', () => {
  const d = new Date('2019-10-24');

  it('formats a full date', () => {
    expect(formatDate(d)).toBe('24 Oct 2019');
  });

  it('formats day and month for lists grouped by year', () => {
    expect(formatDayMonth(d)).toBe('24 Oct');
  });

  it('formats an ISO date for datetime attributes', () => {
    expect(isoDate(d)).toBe('2019-10-24');
  });

  it('uses Sep, never Sept', () => {
    expect(formatDate(new Date('2026-09-05'))).toBe('5 Sep 2026');
  });
});
```

**Step 2: Run it**

Run: `npx vitest run src/lib/dates.test.ts`
Expected: FAIL, cannot resolve `./dates`.

**Step 3: Implement** — `src/lib/dates.ts`

```ts
// Fixed month names: Intl's en-GB short month gives "Sept" on newer ICU versions.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Frontmatter dates are calendar dates parsed as UTC midnight, so read them in UTC.
export const formatDate = (d: Date): string =>
  `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

export const formatDayMonth = (d: Date): string => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);
```

**Step 4: Run it**

Run: `npx vitest run src/lib/dates.test.ts`
Expected: PASS (4 tests).

**Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts
git commit -m "Add date formatting" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 4: Reading time (TDD)

**Files:**
- Create: `src/lib/reading-time.test.ts`, `src/lib/reading-time.ts`

**Step 1: Failing test** — `src/lib/reading-time.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { readingMinutes } from './reading-time';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

describe('readingMinutes', () => {
  it('is at least one minute', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes(words(50))).toBe(1);
  });

  it('reads 220 words per minute, rounded', () => {
    expect(readingMinutes(words(1100))).toBe(5);
    expect(readingMinutes(words(1200))).toBe(5);
    expect(readingMinutes(words(1300))).toBe(6);
  });

  it('ignores imports, code fences and component tags', () => {
    const body = [
      "import { Callout } from '@/components/mdx';",
      words(440),
      '```js',
      words(2000),
      '```',
      '<Callout type="note">',
      words(220),
      '</Callout>',
    ].join('\n\n');
    expect(readingMinutes(body)).toBe(3);
  });
});
```

**Step 2: Run** — `npx vitest run src/lib/reading-time.test.ts` → FAIL (module not found).

**Step 3: Implement** — `src/lib/reading-time.ts`

```ts
const WORDS_PER_MINUTE = 220;

/** Minutes to read an MDX body: prose only, no code blocks, imports or component tags. */
export function readingMinutes(body: string): number {
  const prose = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^import\s.*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ');
  const count = prose.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return Math.max(1, Math.round(count / WORDS_PER_MINUTE));
}
```

**Step 4: Run** — expected PASS (3 tests).

**Step 5: Commit**

```bash
git add src/lib/reading-time.ts src/lib/reading-time.test.ts
git commit -m "Add reading time" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 5: Feed: merge posts and elsewhere entries (TDD)

**Files:**
- Create: `src/lib/feed.test.ts`, `src/lib/feed.ts`

**Step 1: Failing test** — `src/lib/feed.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { buildFeed, collectTags, groupByYear, withTag } from './feed';

const post = (id: string, date: string, tags = ['vue'], draft = false) => ({
  id,
  data: { title: `Post ${id}`, description: `About ${id}`, pubDate: new Date(date), tags, draft },
});
const elsewhere = (title: string, date: string, kind: 'article' | 'talk' = 'article', tags = ['talks']) => ({
  data: { title, url: `https://example.com/${title}`, date: new Date(date), kind, where: 'Medium', tags },
});

describe('buildFeed', () => {
  it('merges posts and elsewhere entries, newest first', () => {
    const feed = buildFeed([post('a', '2026-01-10'), post('b', '2019-05-01')], [elsewhere('talk', '2026-10-30', 'talk')]);
    expect(feed.map((i) => i.title)).toEqual(['talk', 'Post a', 'Post b']);
  });

  it('links posts to /slug/ and keeps elsewhere entries external', () => {
    const [p, e] = buildFeed([post('a', '2026-01-10')], [elsewhere('x', '2020-01-01')]);
    expect(p).toMatchObject({ kind: 'post', url: '/a/', external: false, description: 'About a' });
    expect(e).toMatchObject({ kind: 'article', url: 'https://example.com/x', external: true, where: 'Medium' });
  });

  it('carries the draft flag', () => {
    const [p] = buildFeed([post('a', '2026-01-10', ['vue'], true)], []);
    expect(p.draft).toBe(true);
  });
});

describe('groupByYear', () => {
  it('groups by UTC year, newest year first, keeping order inside a year', () => {
    const feed = buildFeed([post('a', '2026-03-01'), post('b', '2026-01-01'), post('c', '2019-10-24')], []);
    const groups = groupByYear(feed);
    expect(groups.map((g) => g.year)).toEqual([2026, 2019]);
    expect(groups[0].items.map((i) => i.title)).toEqual(['Post a', 'Post b']);
  });
});

describe('collectTags', () => {
  it('counts tags, most used first, then alphabetical', () => {
    const feed = buildFeed([post('a', '2026-01-01', ['vue', 'css']), post('b', '2026-01-02', ['vue'])], [elsewhere('t', '2026-01-03')]);
    expect(collectTags(feed)).toEqual([
      { tag: 'vue', count: 2 },
      { tag: 'css', count: 1 },
      { tag: 'talks', count: 1 },
    ]);
  });
});

describe('withTag', () => {
  it('keeps only items with the tag', () => {
    const feed = buildFeed([post('a', '2026-01-01', ['vue']), post('b', '2026-01-02', ['css'])], []);
    expect(withTag(feed, 'css').map((i) => i.title)).toEqual(['Post b']);
  });
});
```

**Step 2: Run** — `npx vitest run src/lib/feed.test.ts` → FAIL.

**Step 3: Implement** — `src/lib/feed.ts`

```ts
export type FeedItem = {
  kind: 'post' | 'article' | 'talk';
  title: string;
  url: string;
  date: Date;
  description?: string;
  tags: string[];
  /** Where an external entry lives, e.g. "Medium". */
  where?: string;
  external: boolean;
  draft: boolean;
};

export type PostLike = {
  id: string;
  data: { title: string; description: string; pubDate: Date; tags: string[]; draft?: boolean };
};

export type ElsewhereLike = {
  data: {
    title: string;
    url: string;
    date: Date;
    kind: 'article' | 'talk';
    where: string;
    tags: string[];
    description?: string;
  };
};

export function buildFeed(posts: PostLike[], elsewhere: ElsewhereLike[]): FeedItem[] {
  const fromPosts: FeedItem[] = posts.map((p) => ({
    kind: 'post',
    title: p.data.title,
    url: `/${p.id}/`,
    date: p.data.pubDate,
    description: p.data.description,
    tags: p.data.tags,
    external: false,
    draft: p.data.draft ?? false,
  }));
  const fromElsewhere: FeedItem[] = elsewhere.map((e) => ({
    kind: e.data.kind,
    title: e.data.title,
    url: e.data.url,
    date: e.data.date,
    description: e.data.description,
    tags: e.data.tags,
    where: e.data.where,
    external: true,
    draft: false,
  }));
  return [...fromPosts, ...fromElsewhere].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function groupByYear(items: FeedItem[]): { year: number; items: FeedItem[] }[] {
  const years = new Map<number, FeedItem[]>();
  for (const item of items) {
    const year = item.date.getUTCFullYear();
    years.set(year, [...(years.get(year) ?? []), item]);
  }
  return [...years.entries()].sort((a, b) => b[0] - a[0]).map(([year, list]) => ({ year, items: list }));
}

export function collectTags(items: FeedItem[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export const withTag = (items: FeedItem[], tag: string): FeedItem[] => items.filter((i) => i.tags.includes(tag));
```

**Step 4: Run** — expected PASS (6 tests).

**Step 5: Commit**

```bash
git add src/lib/feed.ts src/lib/feed.test.ts
git commit -m "Add feed merging, year groups and tag counts" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 6: Content collections, elsewhere entries and the showcase fixture

The showcase post is a permanent **draft**: never published, used by the end-to-end tests and as a writing reference in `npm run dev`. Drafts appear in `astro dev` and in builds with `SHOW_DRAFTS=1`.

**Files:**
- Create: `src/content.config.ts`, `src/content/elsewhere.yaml`, `src/lib/posts.ts`, `src/content/posts/showcase/index.mdx.wip` (renamed to `index.mdx` in Task 11), `src/content/posts/showcase/sample.png`

**Step 1: `src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const slugLike = /^[a-z0-9-]+$/;

const posts = defineCollection({
  // One folder per post: src/content/posts/<slug>/index.mdx → entry id "<slug>"
  loader: glob({ pattern: '*/index.mdx', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.strictObject({
      title: z.string().min(1),
      description: z.string().min(1).max(160),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string().regex(slugLike)).min(1).max(6),
      threadId: z.string().regex(slugLike),
      draft: z.boolean().default(false),
      cover: image().optional(),
      discuss: z.strictObject({ devto: z.url().optional(), linkedin: z.url().optional() }).optional(),
    }),
});

const elsewhere = defineCollection({
  loader: file('src/content/elsewhere.yaml'),
  schema: z.strictObject({
    id: z.string().optional(),
    title: z.string().min(1),
    url: z.url(),
    date: z.coerce.date(),
    kind: z.enum(['article', 'talk']),
    where: z.string().min(1),
    description: z.string().optional(),
    tags: z.array(z.string().regex(slugLike)).min(1),
  }),
});

export const collections = { posts, elsewhere };
```

**Step 2: `src/content/elsewhere.yaml`**

```yaml
- id: nasa-space-apps-cairo-2026
  title: "Web development as a tool: turn your idea into a live prototype"
  url: https://talks.zohdi.me/nasa-space-apps-cairo-2026/
  date: 2026-10-30
  kind: talk
  where: NASA Space Apps Cairo
  description: Workshop at NASA Space Apps Cairo. Slides on talks.zohdi.me.
  tags: [talks]

- id: login-first-modal-medium
  title: Create reusable “Login First” modal before the user action with Vue.js + Vuex
  url: https://medium.com/@mahmoud.zohdi/create-reusable-login-first-modal-before-the-user-action-with-vue-js-vuex-caa7038b352b
  date: 2019-10-24
  kind: article
  where: Medium
  tags: [vue, vuex]
```

**Step 3: `src/lib/posts.ts`**

```ts
import { getCollection } from 'astro:content';

/** Drafts show in `astro dev` and in test builds (SHOW_DRAFTS=1), never in production builds. */
export const showDrafts = import.meta.env.DEV || process.env.SHOW_DRAFTS === '1';

/** Visible posts, newest first. */
export async function getPosts() {
  const posts = await getCollection('posts', (p) => showDrafts || !p.data.draft);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export const getElsewhere = () => getCollection('elsewhere');
```

**Step 4: Create the fixture image**

```bash
mkdir -p src/content/posts/showcase
node -e "const {Resvg}=require('@resvg/resvg-js');const svg='<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1440\" height=\"560\"><rect width=\"1440\" height=\"560\" fill=\"#dde2ea\"/><circle cx=\"360\" cy=\"280\" r=\"120\" fill=\"#1d3db0\"/><rect x=\"620\" y=\"160\" width=\"240\" height=\"240\" rx=\"24\" fill=\"#2fa89c\"/><polygon points=\"1080,160 1200,400 960,400\" fill=\"#23272e\"/></svg>';require('fs').writeFileSync('src/content/posts/showcase/sample.png',new Resvg(svg).render().asPng())"
file src/content/posts/showcase/sample.png
```

Expected: `PNG image data, 1440 x 560`.

**Step 5: `src/content/posts/showcase/index.mdx.wip`**

The components it imports are created in Task 11, so save it as `index.mdx.wip` for now: the loader only picks up `index.mdx`, which keeps Tasks 7–10 building. Task 11 renames it.

````mdx
---
title: Component showcase
description: Every building block a post can use, on one page. Draft only, used by the tests and as a writing reference.
pubDate: 2026-11-01
tags: [meta]
threadId: showcase
draft: true
---
import { Callout, Figure, StackBlitz, Steps } from '@/components/mdx';
import sample from './sample.png';

This page is never published. It shows every component a post can use, and the end-to-end tests run against it.

## Text

Paragraphs use the reading font at 18 pixels with generous line height. Inline `code` sits in a light box, and links look [like this](https://zohdi.me/).

<Callout type="note">

A note adds context the reader might otherwise miss.

</Callout>

<Callout type="tip">

A tip suggests a better way to do something.

</Callout>

<Callout type="warning">

A warning flags something that can break.

</Callout>

## Flows and figures

<Steps highlight={2} caption="What happens when a logged-out user clicks “Add to cart”.">

1. User clicks “Add to cart”
2. Not logged in: save the action and open the auth modal
3. User logs in or signs up
4. Modal closes and the saved action runs

</Steps>

<Figure src={sample} alt="Three shapes on a grey background" caption="A figure with an optimised image." />

## Code

### Highlighted lines

```js title="store/modules/auth.js" {3,8}
// AuthModule: the store owns the modal's visibility
const state = {
  authModal: { visibility: false }
}

const mutations = {
  setAuthModalVisibility (state, visibility) {
    state.authModal.visibility = visibility
  }
}
```

### A diff

```ts title="track.ts"
export function track(name: string) {
  window.umami.track(name) // [!code --]
  window.umami?.track(name) // [!code ++]
}
```

### No title

```bash
npm run build
```

## Demos

<StackBlitz id="vitejs-vite" title="A StackBlitz project, loaded on click" />
````

**Step 6: Commit**

```bash
git add -A
git commit -m "Add content collections, elsewhere entries and showcase draft" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 7: Styles, fonts and static assets

Port of the mockup's CSS. Class names match the mockup so it stays the visual reference.

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/prose.css`
- Copy: icons from zohdi.me into `public/`, portrait into `src/assets/zohdi.webp`
- Create: `public/robots.txt`

**Step 1: Copy assets**

```bash
mkdir -p public && cp ../zohdi.me/favicon.svg ../zohdi.me/favicon.ico ../zohdi.me/apple-touch-icon.png ../zohdi.me/favicon-192.png public/
mkdir -p src/assets && cp ../talks/theme/assets/zohdi.webp src/assets/zohdi.webp
printf 'User-agent: *\nAllow: /\n\nSitemap: https://blog.zohdi.me/sitemap-index.xml\n' > public/robots.txt
```

**Step 2: `src/styles/tokens.css`**

```css
:root {
  --paper: #eef0f3;
  --surface: #ffffff;
  --ink: #23272e;
  --muted: #5a6372;
  --line: #dde2ea;
  --accent: #1d3db0;
  --accent-fill: #1d3db0;
  --on-accent: #ffffff;
  --faience: #2fa89c;
  --warn: #b4532a;
  --code-bg: #0a1257;
  --code-ink: #d6e0ff;
  --code-dim: #7d88b8;
  --code-mark: #8fe3d8;
  --code-edge: transparent;
  --shadow: 0 1px 2px rgb(20 44 133 / 0.08), 0 18px 40px -18px rgb(20 44 133 / 0.35);
  --display: "Alexandria", system-ui, sans-serif;
  --text: "IBM Plex Sans", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, monospace;
  color-scheme: light;
}

:root[data-theme="dark"] {
  --paper: #0e1330;
  --surface: #161d45;
  --ink: #e8ebf5;
  --muted: #a3acc4;
  --line: #2a3363;
  --accent: #9db0ff;
  --accent-fill: #3858e4;
  --warn: #f08a5d;
  --code-edge: #2a3363;
  --shadow: 0 1px 2px rgb(0 0 0 / 0.3), 0 18px 40px -18px rgb(0 0 0 / 0.6);
  color-scheme: dark;
}
```

**Step 3: `src/styles/global.css`**

```css
/* ---------- base ---------- */
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 24px; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body { margin: 0; min-height: 100vh; background: var(--paper); color: var(--ink); font-family: var(--text); }
a { color: var(--accent); text-underline-offset: 3px; }
a:hover { color: var(--ink); }
:focus-visible { outline: 3px solid var(--faience); outline-offset: 3px; border-radius: 4px; }
::selection { background: color-mix(in srgb, var(--accent-fill) 24%, transparent); }
h1, h2, h3 { text-wrap: balance; }
p { text-wrap: pretty; }
img { max-width: 100%; height: auto; }
[hidden] { display: none !important; }
.skip { position: absolute; left: 16px; top: -100px; z-index: 60; padding: 10px 14px; border-radius: 8px; background: var(--accent-fill); color: var(--on-accent); }
.skip:focus { top: 12px; color: var(--on-accent); }

/* ---------- frame ---------- */
.container { max-width: 1104px; margin: 0 auto; padding-inline: 24px; }
.site-h { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px 32px; padding-block: 24px; }
.brand { display: flex; align-items: center; gap: 12px; color: var(--ink); text-decoration: none; }
.brand:hover { color: var(--ink); }
.brand b { font: 600 20px/1 var(--display); }
.brand span { color: var(--muted); }
.h-right { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; }
.nav { display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 16px; }
.nav a { padding-block: 4px; color: var(--ink); text-decoration: none; }
.nav a:hover { color: var(--accent); text-decoration: underline; }
.nav a[aria-current="page"] { color: var(--accent); box-shadow: inset 0 -2px var(--accent-fill); }
.icon-btn { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 10px; background: var(--surface); color: var(--ink); cursor: pointer; box-shadow: 0 0 0 1px var(--line); }
.icon-btn:hover { box-shadow: 0 0 0 1.5px var(--accent); }
.i-sun, :root[data-theme="dark"] .i-moon { display: none; }
:root[data-theme="dark"] .i-sun { display: block; }
.menu-btn { display: none; }
.m-nav { display: grid; padding-bottom: 8px; }
.m-nav a { padding: 14px 0; border-top: 1px solid var(--line); color: var(--ink); text-decoration: none; font-size: 18px; }
@media (min-width: 641px) { .m-nav { display: none !important; } }
.site-f { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px 24px; margin-top: 72px; padding-block: 28px 48px; border-top: 1px solid var(--line); font-size: 15px; color: var(--muted); }
.site-f nav { display: flex; flex-wrap: wrap; gap: 8px 20px; }

/* ---------- shared bits ---------- */
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { font-size: 14px; padding: 4px 10px; border-radius: 999px; background: var(--surface); color: var(--ink); text-decoration: none; box-shadow: 0 0 0 1px var(--line); }
.chip:hover { color: var(--ink); box-shadow: 0 0 0 1.5px var(--accent); }
.ext { vertical-align: -2px; margin-left: 4px; }
.small-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border: 0; border-radius: 8px; background: var(--surface); color: var(--ink); font: 500 14px/1 var(--text); cursor: pointer; box-shadow: 0 0 0 1px var(--line); text-decoration: none; }
.small-btn:hover { color: var(--ink); box-shadow: 0 0 0 1.5px var(--accent); }
.small-btn.done { color: var(--accent); }
.btn { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 18px; border: 0; border-radius: 10px; background: none; font: 500 16px/1 var(--text); text-decoration: none; color: var(--accent); box-shadow: inset 0 0 0 1.5px currentColor; cursor: pointer; }
.btn:hover { background: color-mix(in srgb, var(--accent-fill) 8%, transparent); color: var(--accent); }

/* ---------- home and lists ---------- */
.intro { padding: 40px 0 36px; }
.intro h1 { margin: 0 0 16px; max-width: 18ch; font: 600 clamp(36px, 5.4vw, 52px)/1.08 var(--display); letter-spacing: -0.015em; }
.intro p { margin: 0; max-width: 60ch; font-size: 19px; line-height: 1.6; color: var(--muted); }
.home-grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 64px; align-items: start; padding-top: 32px; border-top: 1px solid var(--line); }
.home-grid.single { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 900px) { .home-grid { grid-template-columns: minmax(0, 1fr); gap: 48px; } }
.filter { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.filter button { min-height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; color: var(--muted); font: 500 15px/1 var(--text); cursor: pointer; box-shadow: inset 0 0 0 1px var(--line); }
.filter button:hover { color: var(--ink); }
.filter button[aria-pressed="true"] { background: var(--ink); color: var(--paper); box-shadow: none; }
.year { margin: 32px 0 0; font: 600 15px/1 var(--display); color: var(--muted); }
.entries { list-style: none; margin: 0; padding: 0; }
.entries li { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 4px 28px; padding: 22px 0; border-bottom: 1px solid var(--line); }
.entries li:last-child { border-bottom: 0; }
.when-col { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding-top: 5px; }
.when { font-size: 15px; color: var(--muted); }
.kind { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 13px; color: var(--muted); box-shadow: inset 0 0 0 1px var(--line); }
.entries h3 { margin: 0 0 6px; font: 600 24px/1.25 var(--display); }
.entries h3 a { color: var(--ink); text-decoration: none; }
.entries h3 a:hover { color: var(--accent); text-decoration: underline; text-decoration-thickness: 2px; }
.entries p { margin: 0 0 12px; max-width: 64ch; font-size: 17px; line-height: 1.55; color: var(--muted); }
.empty { padding: 24px 0; color: var(--muted); }
@media (max-width: 560px) { .entries li { grid-template-columns: minmax(0, 1fr); } .when-col { flex-direction: row; align-items: center; padding-top: 0; } }
.side { display: grid; gap: 32px; }
.side h2 { margin: 0 0 12px; font: 600 16px/1.3 var(--display); }
.side p { margin: 0 0 10px; font-size: 16px; line-height: 1.55; color: var(--muted); }
.me { display: flex; gap: 16px; align-items: center; margin-bottom: 12px; }
.me img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; object-position: 50% 12%; background: var(--line); }
.me b { display: block; font: 600 17px/1.3 var(--display); }
.me span { font-size: 14px; color: var(--muted); }
.follow { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.follow li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 16px; }
.follow li:last-child { border-bottom: 0; }
.follow a { display: inline-flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none; }
.follow a:hover { color: var(--accent); }
.follow svg { color: var(--muted); }
.tag-list { list-style: none; margin: 0; padding: 32px 0 0; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 12px; }
.tag-list a { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 16px; border-radius: 999px; background: var(--surface); color: var(--ink); text-decoration: none; box-shadow: 0 0 0 1px var(--line); font-size: 17px; }
.tag-list a:hover { box-shadow: 0 0 0 1.5px var(--accent); }
.tag-list span { font-size: 14px; color: var(--muted); }

/* ---------- post chrome ---------- */
.progress { position: fixed; z-index: 40; top: 0; left: 0; height: 3px; width: 0; background: var(--accent-fill); }
.back { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; font-size: 16px; text-decoration: none; }
.post-head { max-width: 840px; padding: 20px 0 32px; }
.post-head h1 { margin: 14px 0 18px; font: 600 clamp(32px, 4.6vw, 46px)/1.12 var(--display); letter-spacing: -0.015em; }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; margin: 0; font-size: 16px; color: var(--muted); }
.meta .chips { margin-left: 4px; }
.post-grid { display: grid; grid-template-columns: minmax(0, 720px) 232px; justify-content: space-between; gap: 64px; padding-top: 36px; border-top: 1px solid var(--line); }
@media (max-width: 1000px) { .post-grid { grid-template-columns: minmax(0, 1fr); } .toc { display: none; } }
.toc { position: sticky; top: 28px; align-self: start; font-size: 15px; }
.toc h2 { margin: 0 0 10px; font: 600 15px/1.3 var(--display); color: var(--muted); }
.toc ol { list-style: none; margin: 0 0 28px; padding: 0; border-left: 1px solid var(--line); }
.toc ol a { display: block; margin-left: -1px; padding: 6px 0 6px 14px; border-left: 2px solid transparent; line-height: 1.4; color: var(--muted); text-decoration: none; }
.toc ol a:hover { color: var(--ink); }
.toc .sub a { padding-left: 28px; }
.toc ol a[aria-current="true"] { color: var(--ink); border-left-color: var(--accent-fill); font-weight: 500; }
.toc .share { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.toc .left { margin: 0 0 16px; font-size: 14px; color: var(--muted); }

/* section bar: replaces the side menu below 1000px */
.secbar { display: none; }
@media (max-width: 1000px) {
  html { scroll-padding-top: 72px; }
  .progress { display: none; }
  .secbar { display: block; position: fixed; z-index: 45; top: 0; left: 0; right: 0; visibility: hidden; transform: translateY(-100%);
    background: color-mix(in srgb, var(--paper) 94%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line); transition: transform 0.2s ease, visibility 0.2s; }
  .secbar.show { visibility: visible; transform: none; }
}
@media (prefers-reduced-motion: reduce) { .secbar { transition: none; } }
.secbar > button { width: 100%; min-height: 50px; display: flex; align-items: center; gap: 10px; padding: 0 20px; border: 0; background: none; color: var(--ink); font: 400 15px/1.2 var(--text); text-align: left; cursor: pointer; }
.secbar .lbl { color: var(--muted); white-space: nowrap; }
.secbar .cur { flex: 1; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.secbar > button svg { flex: none; color: var(--muted); transition: transform 0.2s ease; }
.secbar > button[aria-expanded="true"] svg { transform: rotate(180deg); }
.secbar ol { list-style: none; margin: 0; padding: 0 20px 10px; }
.secbar ol a { display: block; padding: 12px 0; border-top: 1px solid var(--line); color: var(--ink); text-decoration: none; font-size: 16px; }
.secbar ol .sub a { padding-left: 16px; }
.secbar ol a[aria-current="true"] { color: var(--accent); font-weight: 600; }
.secbar .bar { position: absolute; left: 0; bottom: -1px; height: 2px; width: 0; background: var(--accent-fill); }

/* ---------- end of post ---------- */
.post-end { max-width: 720px; }
.author { display: flex; gap: 18px; align-items: center; margin-top: 48px; padding: 20px; border-radius: 14px; background: var(--surface); box-shadow: 0 0 0 1px var(--line); }
.author img { flex: none; width: 72px; height: 72px; border-radius: 50%; object-fit: cover; object-position: 50% 12%; background: var(--line); }
.author p { margin: 0; font-size: 16px; line-height: 1.55; color: var(--muted); }
.author b { display: block; margin-bottom: 2px; font: 600 18px/1.3 var(--display); color: var(--ink); }
.discuss { margin-top: 48px; }
.discuss h2 { margin: 0 0 8px; font: 600 26px/1.25 var(--display); }
.discuss > p { margin: 0 0 18px; font-size: 17px; line-height: 1.6; color: var(--muted); }
.btn-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
giscus-comments { display: block; min-height: 120px; }
.next { display: block; margin-top: 48px; padding: 20px; border-radius: 14px; text-decoration: none; box-shadow: 0 0 0 1px var(--line); }
.next:hover { box-shadow: 0 0 0 1.5px var(--accent); }
.next small { display: block; margin-bottom: 6px; font-size: 15px; color: var(--muted); }
.next b { font: 600 21px/1.3 var(--display); color: var(--ink); }

/* ---------- phones ---------- */
@media (max-width: 640px) {
  .container { padding-inline: 20px; }
  .site-h { flex-wrap: nowrap; padding-block: 14px; }
  .nav { display: none; }
  .menu-btn { display: inline-flex; }
  .h-right { flex-wrap: nowrap; gap: 8px; }
  .intro { padding: 20px 0 28px; }
  .intro h1 { max-width: none; font-size: 34px; }
  .intro p { font-size: 17px; }
  .home-grid { padding-top: 20px; }
  .filter { flex-wrap: nowrap; overflow-x: auto; margin-inline: -20px; padding: 2px 20px 6px; scrollbar-width: none; }
  .filter::-webkit-scrollbar { display: none; }
  .filter button { flex: none; }
  .year { margin-top: 24px; }
  .entries li { gap: 6px; padding: 18px 0; }
  .entries h3 { font-size: 21px; }
  .entries p { margin: 0; font-size: 16px; }
  .entries .chips { display: none; }
  .side { gap: 28px; }
  .back { margin-top: 4px; font-size: 15px; }
  .post-head { padding: 12px 0 24px; }
  .post-head h1 { margin: 10px 0 14px; font-size: 29px; }
  .meta { gap: 6px 14px; font-size: 15px; }
  .post-grid { padding-top: 24px; }
  .author { gap: 14px; padding: 16px; }
  .author img { width: 56px; height: 56px; }
  .btn-row .btn { flex: 1 1 100%; justify-content: center; }
  .site-f { flex-direction: column; margin-top: 48px; }
}
```

**Step 4: `src/styles/prose.css`**

```css
.prose { font-size: 18px; line-height: 1.72; min-width: 0; counter-reset: figure; }
.prose > :first-child { margin-top: 0; }
.prose p { margin: 0 0 1.15em; }
.prose h2 { position: relative; margin: 1.9em 0 0.55em; font: 600 29px/1.25 var(--display); }
.prose h3 { position: relative; margin: 1.6em 0 0.45em; font: 600 21px/1.3 var(--display); }
.prose ul, .prose ol { margin: 0 0 1.15em; padding-left: 1.4em; }
.prose li + li { margin-top: 0.35em; }
.prose blockquote { margin: 1.6em 0; padding: 2px 0 2px 20px; border-left: 3px solid var(--line); color: var(--muted); }
.prose hr { margin: 2.4em 0; border: 0; border-top: 1px solid var(--line); }
.prose :not(pre) > code { font: 0.86em var(--mono); background: var(--surface); padding: 2px 6px; border-radius: 6px; box-shadow: 0 0 0 1px var(--line); }
.anchor { position: absolute; left: -1.1em; padding-right: 0.3em; color: var(--muted); text-decoration: none; opacity: 0; }
.prose h2:hover .anchor, .prose h3:hover .anchor, .anchor:focus-visible { opacity: 1; }
@media (max-width: 800px) { .anchor { display: none; } }

/* figure captions are numbered across Figure and Steps */
.prose figcaption { margin-top: 12px; font-size: 15px; line-height: 1.5; color: var(--muted); }
.prose figcaption::before { counter-increment: figure; content: "Figure " counter(figure) ". "; font-weight: 600; color: var(--ink); }

/* Callout */
.callout { display: flex; gap: 14px; margin: 1.6em 0; padding: 16px 18px; border-radius: 12px; background: var(--surface); box-shadow: 0 0 0 1px var(--line); font-size: 17px; line-height: 1.6; }
.callout svg { flex: none; margin-top: 3px; color: var(--accent); }
.callout-warning svg { color: var(--warn); }
.prose .callout p { margin: 0 0 0.6em; }
.prose .callout p:last-child { margin-bottom: 0; }
.prose .callout .callout-label { margin: 0 0 2px; font-weight: 600; }

/* Figure */
.figure { margin: 2em 0; }
.figure img { display: block; width: 100%; border-radius: 10px; box-shadow: 0 0 0 1px var(--line); }

/* Steps */
.flow { margin: 2em 0; }
.prose .flow ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); grid-auto-flow: column; gap: 28px; counter-reset: step; }
.prose .flow li { position: relative; margin: 0; padding: 14px; border-radius: 12px; background: var(--surface); box-shadow: 0 0 0 1px var(--line); font-size: 15px; line-height: 1.45; counter-increment: step; }
.flow li::before { content: counter(step); display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; margin-bottom: 8px; border-radius: 50%; background: var(--paper); color: var(--muted); font: 600 13px/1 var(--display); box-shadow: inset 0 0 0 1px var(--line); }
.flow li:not(:last-child)::after { content: ""; position: absolute; top: 50%; right: -19px; width: 9px; height: 9px; border-top: 2px solid var(--muted); border-right: 2px solid var(--muted); transform: translateY(-50%) rotate(45deg); }
.flow[data-highlight="1"] li:nth-child(1), .flow[data-highlight="2"] li:nth-child(2), .flow[data-highlight="3"] li:nth-child(3),
.flow[data-highlight="4"] li:nth-child(4), .flow[data-highlight="5"] li:nth-child(5), .flow[data-highlight="6"] li:nth-child(6) { box-shadow: 0 0 0 2px var(--accent-fill); }
.flow[data-highlight="1"] li:nth-child(1)::before, .flow[data-highlight="2"] li:nth-child(2)::before, .flow[data-highlight="3"] li:nth-child(3)::before,
.flow[data-highlight="4"] li:nth-child(4)::before, .flow[data-highlight="5"] li:nth-child(5)::before, .flow[data-highlight="6"] li:nth-child(6)::before { background: var(--accent-fill); color: var(--on-accent); box-shadow: none; }
@media (max-width: 720px) {
  .prose .flow ol { grid-auto-flow: row; grid-template-columns: 1fr; gap: 0; margin-left: 12px; border-left: 2px solid var(--line); }
  .prose .flow li { padding: 1px 0 20px 26px; border-radius: 0; background: none; box-shadow: none !important; font-size: 16px; }
  .prose .flow li:last-child { padding-bottom: 2px; }
  .flow li::before { position: absolute; left: -13px; top: 0; margin: 0; background: var(--surface); }
  .flow li:not(:last-child)::after { display: none; }
  .flow[data-highlight="1"] li:nth-child(1), .flow[data-highlight="2"] li:nth-child(2), .flow[data-highlight="3"] li:nth-child(3),
  .flow[data-highlight="4"] li:nth-child(4), .flow[data-highlight="5"] li:nth-child(5), .flow[data-highlight="6"] li:nth-child(6) { font-weight: 600; }
}

/* Code blocks (Shiki output wrapped by src/lib/shiki/code-frame.ts) */
.code-block { margin: 1.8em 0; border-radius: 12px; background: var(--code-bg); color: var(--code-ink); box-shadow: 0 0 0 1px var(--code-edge); }
.code-header { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 6px 8px 6px 18px; border-bottom: 1px solid rgb(214 224 255 / 0.14); font: 500 14px/1.2 var(--mono); }
.code-title { color: #ffffff; overflow-wrap: anywhere; }
.code-lang { margin-right: auto; font-family: var(--text); color: var(--code-dim); }
.code-copy { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 0; border-radius: 8px; background: rgb(214 224 255 / 0.12); color: var(--code-ink); font: 500 14px/1 var(--text); cursor: pointer; }
.code-copy:hover { background: rgb(214 224 255 / 0.2); }
.code-block pre.astro-code { margin: 0; padding: 14px 0; border-radius: 0 0 12px 12px; background: transparent !important; white-space: normal; font: 15px/1.7 var(--mono); overflow-x: auto; }
.code-block pre code { display: inline-block; min-width: 100%; counter-reset: line; }
.code-block .line { display: block; white-space: pre; padding-right: 18px; counter-increment: line; }
.code-block .line::before { content: counter(line); display: inline-block; width: 3.2em; padding-right: 1.2em; text-align: right; color: var(--code-dim); }
.code-block .line.highlighted { background: rgb(143 227 216 / 0.12); box-shadow: inset 3px 0 var(--code-mark); }
.code-block .line.highlighted::before { color: var(--code-mark); }
.code-block .line.diff.add { background: rgb(76 196 147 / 0.14); }
.code-block .line.diff.add::before { content: "+"; color: #4cc493; }
.code-block .line.diff.remove { background: rgb(240 138 93 / 0.14); }
.code-block .line.diff.remove::before { content: "\2212"; color: #f08a5d; }

/* StackBlitz */
.demo { display: block; margin: 1.8em 0; padding: 18px; border-radius: 12px; background: var(--surface); box-shadow: 0 0 0 1px var(--line); }
.prose .demo-title { margin: 0 0 12px; font: 600 17px/1.3 var(--display); }
.demo-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.prose .demo-note { margin: 10px 0 0; font-size: 14px; color: var(--muted); }
.demo iframe { display: block; width: 100%; height: 520px; margin-top: 14px; border: 0; border-radius: 8px; background: var(--paper); }

@media (max-width: 640px) {
  .prose { font-size: 18px; line-height: 1.66; }
  .prose h2 { margin-top: 1.7em; font-size: 25px; }
  .prose h3 { font-size: 20px; }
  .callout { gap: 12px; padding: 14px; font-size: 16px; }
  .code-block { margin-inline: -20px; border-radius: 0; }
  .code-block pre.astro-code { border-radius: 0; font-size: 13.5px; }
  .code-header { padding-left: 20px; }
  .code-block .line::before { width: 2.6em; padding-right: 0.9em; }
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "Add design tokens, global and prose styles, icons" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 8: Base layout, SEO head, header, theme toggle, footer

**Files:**
- Create: `src/components/Seo.astro`, `src/components/Header.astro`, `src/components/ThemeToggle.astro`, `src/components/Footer.astro`, `src/components/Analytics.astro`, `src/scripts/copy-buttons.ts`, `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro`

**Step 1: `src/components/Seo.astro`**

```astro
---
import { SITE } from '../lib/site';

export interface Props {
  /** Page title without the site suffix. Omit on the home page. */
  title?: string;
  description?: string;
  /** Root-relative or absolute URL of a 1200×630 image. */
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: Date;
  modifiedTime?: Date;
  tags?: string[];
  noindex?: boolean;
}

const {
  title,
  description = SITE.description,
  image = '/og/home.png',
  type = 'website',
  publishedTime,
  modifiedTime,
  tags = [],
  noindex = false,
} = Astro.props;

const fullTitle = `${title ?? SITE.title} · ${SITE.author}`;
const canonical = new URL(Astro.url.pathname, Astro.site);
const imageUrl = new URL(image, Astro.site);
const author = { '@type': 'Person', '@id': SITE.personId, name: SITE.author, url: SITE.links.home };
const jsonLd =
  type === 'article'
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        url: canonical.href,
        mainEntityOfPage: canonical.href,
        image: imageUrl.href,
        datePublished: publishedTime?.toISOString(),
        dateModified: (modifiedTime ?? publishedTime)?.toISOString(),
        keywords: tags.join(', '),
        author,
        publisher: { '@id': SITE.personId },
      }
    : { '@context': 'https://schema.org', '@type': 'Blog', name: SITE.title, url: new URL('/', Astro.site).href, description, author };
// Escape "<" so a title can never close the script tag.
const jsonLdText = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
---
<title>{fullTitle}</title>
<meta name="description" content={description} />
{noindex ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={canonical.href} />}
<meta property="og:type" content={type} />
<meta property="og:site_name" content={SITE.title} />
<meta property="og:title" content={title ?? SITE.title} />
<meta property="og:description" content={description} />
{!noindex && <meta property="og:url" content={canonical.href} />}
<meta property="og:image" content={imageUrl.href} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
{publishedTime && <meta property="article:published_time" content={publishedTime.toISOString()} />}
{modifiedTime && <meta property="article:modified_time" content={modifiedTime.toISOString()} />}
{tags.map((tag) => <meta property="article:tag" content={tag} />)}
<script type="application/ld+json" set:html={jsonLdText} />
```

**Step 2: `src/components/ThemeToggle.astro`**

```astro
<button class="icon-btn" type="button" data-theme-toggle aria-label="Switch to dark theme">
  <svg class="i-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path></svg>
  <svg class="i-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
</button>

<script>
  import { track } from '../lib/track';

  const root = document.documentElement;
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');

  const syncLabel = () =>
    button?.setAttribute('aria-label', root.dataset.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');

  syncLabel();
  button?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // storage blocked (private mode): the choice lasts for this page only
    }
    syncLabel();
    window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
    track('theme_toggle', { theme: next });
  });
</script>
```

**Step 3: `src/components/Header.astro`**

```astro
---
import ThemeToggle from './ThemeToggle.astro';

interface Props {
  current?: 'posts' | 'tags';
}
const { current } = Astro.props;
const links = [
  { href: '/', label: 'Posts', key: 'posts' },
  { href: '/tags/', label: 'Tags', key: 'tags' },
  { href: '/rss.xml', label: 'RSS' },
  { href: 'https://zohdi.me/', label: 'zohdi.me' },
];
---
<header class="container site-h">
  <a class="brand" href="/">
    <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="var(--accent-fill)"></rect><polygon fill="#fff" points="17,15 47,15 47,22 28,42 47,42 47,49 17,49 17,42 36,22 17,22"></polygon></svg>
    <b>Zohdi</b>
    <span>blog</span>
  </a>
  <div class="h-right">
    <nav class="nav" aria-label="Main">
      {links.map((l) => <a href={l.href} aria-current={l.key && l.key === current ? 'page' : undefined}>{l.label}</a>)}
    </nav>
    <ThemeToggle />
    <button class="icon-btn menu-btn" type="button" aria-expanded="false" aria-controls="m-nav" aria-label="Menu" data-menu-btn>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>
    </button>
  </div>
</header>
<nav class="m-nav container" id="m-nav" aria-label="Main menu" hidden>
  {links.map((l) => <a href={l.href}>{l.label}</a>)}
</nav>

<script>
  const button = document.querySelector<HTMLButtonElement>('[data-menu-btn]');
  const nav = document.getElementById('m-nav');
  button?.addEventListener('click', () => {
    if (!nav) return;
    const open = nav.hidden;
    nav.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  });
</script>
```

**Step 4: `src/components/Footer.astro`**

```astro
---
import { SITE } from '../lib/site';
const year = new Date().getFullYear();
---
<footer class="container">
  <div class="site-f">
    <span>© {year} {SITE.author}. Built with Astro, <a href={SITE.links.repo}>source on GitHub</a>.</span>
    <nav aria-label="Elsewhere">
      <a href="/rss.xml">RSS</a>
      <a href={SITE.links.github}>GitHub</a>
      <a href={SITE.links.linkedin}>LinkedIn</a>
      <a href={SITE.links.home}>zohdi.me</a>
    </nav>
  </div>
</footer>
```

**Step 5: `src/components/Analytics.astro`**

```astro
---
import { UMAMI_WEBSITE_ID } from '../lib/site';
---
{UMAMI_WEBSITE_ID && <script is:inline defer src="https://cloud.umami.is/script.js" data-website-id={UMAMI_WEBSITE_ID} data-domains="blog.zohdi.me"></script>}
```

**Step 6: `src/scripts/copy-buttons.ts`** (site-wide: copy-link buttons and tracked links)

```ts
import { copyText, flash } from '../lib/copy';
import { track } from '../lib/track';

document.addEventListener('click', async (event) => {
  const target = event.target as Element;

  const button = target.closest<HTMLButtonElement>('button[data-copy-text]');
  if (button) {
    const text = button.dataset.copyText ?? '';
    if (await copyText(text)) flash(button, button.dataset.done ?? 'Copied');
    else window.prompt('Copy this:', text);
    if (button.dataset.event) track(button.dataset.event);
    return;
  }

  const link = target.closest<HTMLAnchorElement>('a[data-event]');
  if (link?.dataset.event) {
    track(link.dataset.event, link.dataset.eventLabel ? { label: link.dataset.eventLabel } : undefined);
  }
});
```

**Step 7: `src/layouts/BaseLayout.astro`**

```astro
---
import '@fontsource/alexandria/600.css';
import '@fontsource/alexandria/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '../styles/tokens.css';
import '../styles/global.css';
import '../styles/prose.css';
import Analytics from '../components/Analytics.astro';
import Footer from '../components/Footer.astro';
import Header from '../components/Header.astro';
import Seo, { type Props as SeoProps } from '../components/Seo.astro';

type Props = SeoProps & { current?: 'posts' | 'tags' };
const { current, ...seo } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <!-- Must run before any CSS so the page never flashes the wrong theme -->
    <script is:inline>
      (function () {
        var saved = null;
        try { saved = localStorage.getItem('theme'); } catch (e) {}
        var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      })();
    </script>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Seo {...seo} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="alternate" type="application/rss+xml" title="Zohdi blog" href="/rss.xml" />
    <Analytics />
  </head>
  <body>
    <a class="skip" href="#content">Skip to content</a>
    <Header current={current} />
    <slot />
    <Footer />
    <script>
      import '../scripts/copy-buttons';
    </script>
  </body>
</html>
```

**Step 8: Use the layout on the placeholder home** — `src/pages/index.astro`

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout current="posts">
  <main class="container" id="content"><section class="intro"><h1>Notes from building for the web</h1></section></main>
</BaseLayout>
```

**Step 9: Build and look**

Run: `npx astro build`
Expected: build passes; `grep -c 'data-theme' dist/index.html` prints a number ≥ 1. Open `npx astro preview` → http://localhost:4321/ and check header, theme toggle (moon/sun swap, persists after reload) and footer against the mockup. Stop the preview.

**Step 10: Commit**

```bash
git add -A
git commit -m "Add base layout, SEO head, header, theme toggle and footer" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 9: Home page

**Files:**
- Create: `src/components/EntryList.astro`, `src/components/AboutCard.astro`, `src/components/FollowList.astro`
- Modify: `src/pages/index.astro`

**Step 1: `src/components/EntryList.astro`**

```astro
---
import type { FeedItem } from '../lib/feed';
import { groupByYear } from '../lib/feed';
import { formatDayMonth, isoDate } from '../lib/dates';

interface Props {
  items: FeedItem[];
  /** Topics for the filter buttons. The filter only shows with two or more. */
  topics?: string[];
}
const { items, topics = [] } = Astro.props;
const groups = groupByYear(items);
const label = (i: FeedItem) => (i.draft ? 'Draft' : i.external ? (i.kind === 'talk' ? 'Talk' : i.where) : undefined);
---
<section class="feed" aria-label="Writing and talks">
  <topic-filter>
    {topics.length > 1 && (
      <div class="filter" role="group" aria-label="Filter by topic">
        <button type="button" data-filter="all" aria-pressed="true">All</button>
        {topics.map((t) => <button type="button" data-filter={t} aria-pressed="false">{t}</button>)}
      </div>
    )}
    {groups.map((g) => (
      <div class="group">
        <h2 class="year">{g.year}</h2>
        <ol class="entries">
          {g.items.map((i) => (
            <li data-tags={i.tags.join(' ')}>
              <div class="when-col">
                <time class="when" datetime={isoDate(i.date)}>{formatDayMonth(i.date)}</time>
                {label(i) && <span class="kind">{label(i)}</span>}
              </div>
              <div>
                <h3>
                  <a href={i.url} data-event={i.external ? 'outbound' : undefined} data-event-label={i.where}>{i.title}{i.external && (<svg class="ext" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label={`(opens ${i.where})`}><path d="M7 17 17 7M8 7h9v9"></path></svg>)}</a>
                </h3>
                {i.description && <p>{i.description}</p>}
                <div class="chips">{i.tags.map((t) => <a class="chip" href={`/tags/${t}/`}>{t}</a>)}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    ))}
    <p class="empty filter-empty" hidden>Nothing on this topic yet.</p>
    {items.length === 0 && <p class="empty">No posts yet.</p>}
  </topic-filter>
</section>

<script>
  import { track } from '../lib/track';

  class TopicFilter extends HTMLElement {
    connectedCallback() {
      const buttons = [...this.querySelectorAll<HTMLButtonElement>('[data-filter]')];
      if (buttons.length === 0) return;
      const apply = (topic: string) => {
        let shown = 0;
        for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.filter === topic));
        for (const group of this.querySelectorAll<HTMLElement>('.group')) {
          let inGroup = 0;
          for (const li of group.querySelectorAll<HTMLElement>('.entries li')) {
            const match = topic === 'all' || (li.dataset.tags ?? '').split(' ').includes(topic);
            li.hidden = !match;
            if (match) inGroup++;
          }
          group.hidden = inGroup === 0;
          shown += inGroup;
        }
        const empty = this.querySelector<HTMLElement>('.filter-empty');
        if (empty) empty.hidden = shown > 0;
      };
      for (const b of buttons) {
        b.addEventListener('click', () => {
          const topic = b.dataset.filter ?? 'all';
          apply(topic);
          const url = new URL(location.href);
          if (topic === 'all') url.searchParams.delete('topic');
          else url.searchParams.set('topic', topic);
          history.replaceState(null, '', url);
          track('filter_topic', { topic });
        });
      }
      const initial = new URL(location.href).searchParams.get('topic');
      if (initial && buttons.some((b) => b.dataset.filter === initial)) apply(initial);
    }
  }
  customElements.define('topic-filter', TopicFilter);
</script>
```

**Step 2: `src/components/AboutCard.astro`**

```astro
---
import { Image } from 'astro:assets';
import portrait from '../assets/zohdi.webp';
import { SITE } from '../lib/site';
---
<section>
  <div class="me">
    <Image src={portrait} alt="" width={128} height={128} />
    <div><b>{SITE.author}</b><span>Senior Software Engineer</span></div>
  </div>
  <p>Frontend first, with hands-on backend work when the product needs it.</p>
  <a href={SITE.links.home}>More about me on zohdi.me</a>
</section>
```

**Step 3: `src/components/FollowList.astro`**

```astro
---
import { SITE } from '../lib/site';
---
<section>
  <h2>Follow</h2>
  <ul class="follow">
    <li>
      <a href="/rss.xml"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 19a1 1 0 1 0 0-.01M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"></path></svg>RSS feed</a>
      <button class="small-btn" type="button" data-copy-text={`${SITE.url}/rss.xml`} data-done="Copied">Copy URL</button>
    </li>
    <li><a href={SITE.links.github}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"></path></svg>GitHub</a></li>
    <li><a href={SITE.links.linkedin}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"></path></svg>LinkedIn</a></li>
  </ul>
</section>
```

**Step 4: `src/pages/index.astro`**

```astro
---
import AboutCard from '../components/AboutCard.astro';
import EntryList from '../components/EntryList.astro';
import FollowList from '../components/FollowList.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
import { buildFeed, collectTags } from '../lib/feed';
import { getElsewhere, getPosts } from '../lib/posts';

const feed = buildFeed(await getPosts(), await getElsewhere());
const topics = collectTags(feed).map((t) => t.tag);
---
<BaseLayout current="posts">
  <main class="container" id="content">
    <section class="intro">
      <h1>Notes from building for the web</h1>
      <p>I'm Mahmoud Zohdi, a senior software engineer who works mostly on the frontend. I write about what I build at work and on the side, and what it taught me.</p>
    </section>
    <div class="home-grid">
      <EntryList items={feed} topics={topics} />
      <aside class="side" aria-label="About and follow">
        <AboutCard />
        <FollowList />
      </aside>
    </div>
  </main>
</BaseLayout>
```

**Step 5: Build and look**

```bash
npx astro build && npx astro preview
```

Expected: build passes. At http://localhost:4321/ the home matches the mockup's home: years 2026 and 2019, the talk with a "Talk" label, the Medium post with a "Medium" label, filter buttons (talks, vue, vuex), about card with photo, Follow list. Click "talks": only the talk shows, URL gets `?topic=talks`. Stop the preview.

**Step 6: Commit**

```bash
git add -A
git commit -m "Add home page with topic filter, year groups and sidebar" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 10: Code blocks: blueprint theme and code-frame transformer (TDD)

**Files:**
- Create: `src/lib/shiki/blueprint.ts`, `src/lib/shiki/code-frame.ts`, `src/lib/shiki/code-frame.test.ts`
- Modify: `astro.config.ts`

**Step 1: `src/lib/shiki/blueprint.ts`** (same colours as the talks theme)

```ts
import type { ThemeRegistration } from 'shiki';

/** "Blueprint": code colours from the zohdi.me palette, shared with talks.zohdi.me. Navy in light and dark mode. */
export const blueprint: ThemeRegistration = {
  name: 'zohdi-blueprint',
  type: 'dark',
  colors: { 'editor.background': '#0a1257', 'editor.foreground': '#d6e0ff' },
  tokenColors: [
    { settings: { foreground: '#d6e0ff' } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#7d88b8', fontStyle: 'italic' } },
    { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'keyword.operator.new', 'keyword.operator.expression', 'variable.language'], settings: { foreground: '#9db0ff' } },
    { scope: ['string', 'string.quoted', 'string.template', 'punctuation.definition.string', 'markup.inline.raw'], settings: { foreground: '#8fe3d8' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character', 'support.constant', 'constant.other'], settings: { foreground: '#f08a5d' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call', 'variable.function'], settings: { foreground: '#ffffff' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class'], settings: { foreground: '#b9c6ff' } },
    { scope: ['entity.name.tag', 'punctuation.definition.tag'], settings: { foreground: '#9db0ff' } },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#8fe3d8', fontStyle: 'italic' } },
    { scope: ['variable', 'variable.other', 'variable.parameter', 'meta.object-literal.key', 'support.type.property-name'], settings: { foreground: '#d6e0ff' } },
    { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: '#a3acc4' } },
    { scope: ['markup.heading', 'entity.name.section'], settings: { foreground: '#ffffff', fontStyle: 'bold' } },
    { scope: ['markup.inserted'], settings: { foreground: '#4cc493' } },
    { scope: ['markup.deleted'], settings: { foreground: '#f08a5d' } },
  ],
};
```

**Step 2: Failing test** — `src/lib/shiki/code-frame.test.ts`

```ts
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
```

**Step 3: Run** — `npx vitest run src/lib/shiki` → FAIL (module not found).

**Step 4: Implement** — `src/lib/shiki/code-frame.ts`

```ts
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
      const header = el('div', { className: ['code-header'] }, [
        ...(title ? [el('span', { className: ['code-title'] }, [text(title)])] : []),
        el('span', { className: ['code-lang'] }, [text(languageName(lang))]),
        el('button', { type: 'button', className: ['code-copy'], ariaLabel: 'Copy code' }, [
          el('span', { dataLabel: '' }, [text('Copy')]),
        ]),
      ]);
      root.children = [el('figure', { className: ['code-block'], dataLang: lang }, [header, pre])];
    },
  };
}
```

**Step 5: Run** — `npx vitest run src/lib/shiki` → expected PASS (4 tests). If an assertion fails only on attribute order or quoting, update the expected string to the real serialisation; the structure is what matters.

**Step 6: Wire into `astro.config.ts`**

```ts
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
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/404') })],
  markdown: {
    shikiConfig: {
      theme: blueprint,
      transformers: [transformerMetaHighlight(), transformerNotationDiff(), transformerCodeFrame()],
    },
  },
});
```

**Step 7: Commit**

```bash
git add -A
git commit -m "Add blueprint code theme and code-frame transformer" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 11: MDX components

**Files:**
- Create: `src/components/mdx/Callout.astro`, `Figure.astro`, `Steps.astro`, `StackBlitz.astro`, `index.ts`

**Step 1: `src/components/mdx/Callout.astro`**

```astro
---
interface Props {
  type?: 'note' | 'tip' | 'warning';
}
const { type = 'note' } = Astro.props;
const label = { note: 'Note', tip: 'Tip', warning: 'Warning' }[type];
---
<aside class={`callout callout-${type}`} role="note">
  {type === 'warning' ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"></path></svg>
  ) : type === 'tip' ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"></path></svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 7.5v.5"></path></svg>
  )}
  <div>
    <p class="callout-label">{label}</p>
    <slot />
  </div>
</aside>
```

**Step 2: `src/components/mdx/Figure.astro`**

```astro
---
import type { ImageMetadata } from 'astro';
import { Image } from 'astro:assets';

interface Props {
  src: ImageMetadata;
  alt: string;
  caption?: string;
}
const { src, alt, caption } = Astro.props;
---
<figure class="figure">
  <Image src={src} alt={alt} widths={[720, 1440]} sizes="(max-width: 760px) 100vw, 720px" />
  {caption && <figcaption>{caption}</figcaption>}
</figure>
```

**Step 3: `src/components/mdx/Steps.astro`**

```astro
---
interface Props {
  /** 1-based number of the step to emphasise (1–6). */
  highlight?: number;
  caption?: string;
}
const { highlight, caption } = Astro.props;
---
<figure class="flow" data-highlight={highlight}>
  <slot />
  {caption && <figcaption>{caption}</figcaption>}
</figure>
```

**Step 4: `src/components/mdx/StackBlitz.astro`**

The plain link works without JavaScript and in RSS; the button that loads the iframe only appears when JavaScript runs.

```astro
---
interface Props {
  /** StackBlitz project id, from https://stackblitz.com/edit/<id> */
  id: string;
  title: string;
  /** File to open, e.g. "src/App.vue" */
  file?: string;
}
const { id, title, file } = Astro.props;
const url = `https://stackblitz.com/edit/${id}`;
const embed = `${url}?embed=1&view=preview${file ? `&file=${encodeURIComponent(file)}` : ''}`;
---
<stackblitz-embed class="demo" data-src={embed} data-id={id} data-title={title}>
  <p class="demo-title">{title}</p>
  <div class="demo-actions">
    <button class="btn" type="button" data-load hidden>Load interactive demo</button>
    <a class="small-btn" href={url} target="_blank" rel="noopener">Open on StackBlitz</a>
  </div>
  <p class="demo-note" data-note hidden>Loading it here connects to stackblitz.com.</p>
</stackblitz-embed>

<script>
  import { track } from '../../lib/track';

  class StackBlitzEmbed extends HTMLElement {
    connectedCallback() {
      const button = this.querySelector<HTMLButtonElement>('[data-load]');
      const note = this.querySelector<HTMLElement>('[data-note]');
      if (!button || !note) return;
      button.hidden = false;
      note.hidden = false;
      button.addEventListener('click', () => {
        const frame = document.createElement('iframe');
        frame.src = this.dataset.src ?? '';
        frame.title = this.dataset.title ?? 'Interactive demo';
        frame.loading = 'lazy';
        this.append(frame);
        button.remove();
        note.remove();
        track('load_demo', { id: this.dataset.id ?? '' });
      });
    }
  }
  customElements.define('stackblitz-embed', StackBlitzEmbed);
</script>
```

**Step 5: `src/components/mdx/index.ts`**

```ts
export { default as Callout } from './Callout.astro';
export { default as Figure } from './Figure.astro';
export { default as StackBlitz } from './StackBlitz.astro';
export { default as Steps } from './Steps.astro';
```

**Step 6: Activate the showcase and build with drafts**

```bash
git mv src/content/posts/showcase/index.mdx.wip src/content/posts/showcase/index.mdx
SHOW_DRAFTS=1 npx astro build
```

Expected: passes. The showcase has no page yet (Task 12), so this only proves the MDX and its imports compile.

**Step 7: Commit**

```bash
git add -A
git commit -m "Add Callout, Figure, Steps and StackBlitz components" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 12: Post page

**Files:**
- Create: `src/components/PostToc.astro`, `src/components/SectionBar.astro`, `src/components/AuthorCard.astro`, `src/scripts/post-nav.ts`, `src/scripts/code-copy.ts`, `src/pages/[slug].astro`

**Step 1: `src/components/PostToc.astro`** (desktop side menu)

```astro
---
import type { MarkdownHeading } from 'astro';

interface Props {
  toc: MarkdownHeading[];
  minutes: number;
  shareUrl: string;
}
const { toc, minutes, shareUrl } = Astro.props;
const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
---
<aside class="toc" aria-label="On this page">
  {toc.length > 0 && (
    <>
      <h2>On this page</h2>
      <ol>
        {toc.map((h) => (
          <li class={h.depth === 3 ? 'sub' : undefined}><a href={`#${h.slug}`} data-toc-link>{h.text}</a></li>
        ))}
      </ol>
    </>
  )}
  <p class="left" data-minutes-left>{minutes} min read</p>
  <h2>Share</h2>
  <div class="share">
    <button class="small-btn" type="button" data-copy-text={shareUrl} data-done="Link copied" data-event="copy_link">Copy link</button>
    <a class="small-btn" href={linkedIn} target="_blank" rel="noopener" data-event="share_linkedin">LinkedIn</a>
  </div>
  <button class="small-btn" type="button" data-to-top>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"></path></svg>
    Back to top
  </button>
</aside>
```

**Step 2: `src/components/SectionBar.astro`** (phones and tablets)

```astro
---
import type { MarkdownHeading } from 'astro';

interface Props {
  toc: MarkdownHeading[];
}
const { toc } = Astro.props;
---
{toc.length > 0 && (
  <div class="secbar" data-secbar inert>
    <button type="button" aria-expanded="false" aria-controls="secbar-list" data-secbar-btn>
      <span class="lbl">On this page</span>
      <span class="cur" data-secbar-cur>{toc[0].text}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>
    </button>
    <ol id="secbar-list" hidden>
      {toc.map((h) => (
        <li class={h.depth === 3 ? 'sub' : undefined}><a href={`#${h.slug}`} data-toc-link>{h.text}</a></li>
      ))}
    </ol>
    <span class="bar" data-secbar-bar></span>
  </div>
)}
```

**Step 3: `src/components/AuthorCard.astro`**

```astro
---
import { Image } from 'astro:assets';
import portrait from '../assets/zohdi.webp';
import { SITE } from '../lib/site';
---
<div class="author">
  <Image src={portrait} alt="" width={144} height={144} />
  <p><b>{SITE.author}</b>Senior software engineer, frontend first. More about me on <a href={SITE.links.home}>zohdi.me</a>.</p>
</div>
```

**Step 4: `src/scripts/post-nav.ts`**

```ts
import { track } from '../lib/track';

const article = document.querySelector<HTMLElement>('[data-article]');

if (article) {
  const heads = [...article.querySelectorAll<HTMLElement>('h2[id], h3[id]')];
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
  const progress = document.querySelector<HTMLElement>('[data-progress]');
  const head = document.querySelector<HTMLElement>('.post-head');
  const secbar = document.querySelector<HTMLElement>('[data-secbar]');
  const secButton = document.querySelector<HTMLButtonElement>('[data-secbar-btn]');
  const secList = document.getElementById('secbar-list');
  const secCurrent = document.querySelector<HTMLElement>('[data-secbar-cur]');
  const secProgress = document.querySelector<HTMLElement>('[data-secbar-bar]');
  const minutesLeft = document.querySelector<HTMLElement>('[data-minutes-left]');
  const minutes = Number(article.dataset.minutes) || 1;

  // "#" links on headings, added here so RSS and no-JS readers don't see them
  for (const h of heads) {
    h.dataset.label = h.textContent?.trim() ?? '';
    const anchor = document.createElement('a');
    anchor.className = 'anchor';
    anchor.href = `#${h.id}`;
    anchor.textContent = '#';
    anchor.setAttribute('aria-label', `Link to section: ${h.dataset.label}`);
    h.prepend(anchor);
  }

  const setList = (open: boolean) => {
    secButton?.setAttribute('aria-expanded', String(open));
    if (secList) secList.hidden = !open;
  };

  const update = () => {
    const box = article.getBoundingClientRect();
    const read = Math.min(1, Math.max(0, (innerHeight * 0.3 - box.top) / box.height));
    if (progress) progress.style.width = `${read * 100}%`;
    if (secProgress) secProgress.style.width = `${read * 100}%`;

    let active = heads[0];
    for (const h of heads) if (h.getBoundingClientRect().top < innerHeight * 0.3) active = h;
    for (const link of links) link.setAttribute('aria-current', String(Boolean(active) && link.hash === `#${active.id}`));
    if (secCurrent && active) secCurrent.textContent = active.dataset.label ?? '';

    const pastHead = head ? head.getBoundingClientRect().bottom < 0 : false;
    if (secbar) {
      secbar.classList.toggle('show', pastHead);
      secbar.inert = !pastHead;
    }
    if (!pastHead) setList(false);

    if (minutesLeft) {
      minutesLeft.textContent = read >= 0.98 ? 'Finished' : `${Math.max(1, Math.ceil(minutes * (1 - read)))} min left`;
    }
  };

  let queued = false;
  addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        update();
        queued = false;
      });
    },
    { passive: true },
  );
  addEventListener('resize', update);
  update();

  secButton?.addEventListener('click', () => setList(secList?.hidden ?? false));
  for (const link of links) {
    link.addEventListener('click', () => {
      setList(false);
      track('toc_click');
    });
  }
  document.querySelector('[data-to-top]')?.addEventListener('click', () => scrollTo({ top: 0 }));
}
```

**Step 5: `src/scripts/code-copy.ts`**

```ts
import { copyText, flash } from '../lib/copy';
import { track } from '../lib/track';

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

for (const button of document.querySelectorAll<HTMLButtonElement>('.code-copy')) {
  button.addEventListener('click', async () => {
    const figure = button.closest<HTMLElement>('.code-block');
    const code = figure?.querySelector('code');
    if (!figure || !code) return;
    // Copy what the code becomes: skip lines a diff removes
    const lines = [...code.querySelectorAll<HTMLElement>('.line')].filter((l) => !l.classList.contains('remove'));
    const text = lines.map((l) => l.textContent ?? '').join('\n');
    if (await copyText(text)) {
      flash(button, 'Copied');
    } else {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      flash(button, isMac ? 'Press ⌘C' : 'Press Ctrl+C', 3000);
    }
    track('copy_code', { lang: figure.dataset.lang ?? '' });
  });
}
```

**Step 6: `src/pages/[slug].astro`**

```astro
---
import { render } from 'astro:content';
import AuthorCard from '../components/AuthorCard.astro';
import Discuss from '../components/Discuss.astro';
import PostToc from '../components/PostToc.astro';
import SectionBar from '../components/SectionBar.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
import { formatDate, isoDate } from '../lib/dates';
import { getPosts } from '../lib/posts';
import { readingMinutes } from '../lib/reading-time';

export async function getStaticPaths() {
  const posts = await getPosts(); // newest first
  return posts.map((post, i) => ({
    params: { slug: post.id },
    props: { post, older: posts[i + 1], newer: posts[i - 1] },
  }));
}

const { post, older, newer } = Astro.props;
const { Content, headings } = await render(post);
const { title, description, pubDate, updatedDate, tags, threadId, discuss, cover } = post.data;
const toc = headings.filter((h) => h.depth === 2 || h.depth === 3);
const minutes = readingMinutes(post.body ?? '');
const shareUrl = new URL(`/${post.id}/`, Astro.site).href;
const suggestion = older ?? newer;
---
<BaseLayout title={title} description={description} image={cover?.src ?? `/og/${post.id}.png`} type="article" publishedTime={pubDate} modifiedTime={updatedDate} tags={tags}>
  <div class="progress" data-progress aria-hidden="true"></div>
  <SectionBar toc={toc} />
  <main class="container" id="content">
    <a class="back" href="/"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>All posts</a>
    <header class="post-head">
      <h1>{title}</h1>
      <p class="meta">
        <time datetime={isoDate(pubDate)}>{formatDate(pubDate)}</time>
        {updatedDate && <span>Updated {formatDate(updatedDate)}</span>}
        <span>{minutes} min read</span>
        <span class="chips">{tags.map((t) => <a class="chip" href={`/tags/${t}/`}>{t}</a>)}</span>
      </p>
    </header>
    <div class="post-grid">
      <div>
        <article class="prose" data-article data-minutes={minutes}>
          <Content />
        </article>
        <div class="post-end">
          <AuthorCard />
          <Discuss threadId={threadId} discuss={discuss} />
          {suggestion && (
            <a class="next" href={`/${suggestion.id}/`}><small>{suggestion === older ? 'Previous post' : 'Next post'}</small><b>{suggestion.data.title}</b></a>
          )}
        </div>
      </div>
      <PostToc toc={toc} minutes={minutes} shareUrl={shareUrl} />
    </div>
  </main>
  <script>
    import '../scripts/post-nav';
    import '../scripts/code-copy';
  </script>
</BaseLayout>
```

`Discuss` comes in Task 13. Create a stub now so this task builds — `src/components/Discuss.astro`:

```astro
---
interface Props {
  threadId: string;
  discuss?: { devto?: string; linkedin?: string };
}
---
```

**Step 7: Build with drafts and compare with the mockup**

```bash
SHOW_DRAFTS=1 npx astro build && npx astro preview
```

Open http://localhost:4321/showcase/ next to the mockup's post page. Check: header and meta, side menu tracks the section while scrolling, progress bar, three callouts, numbered "Figure 1." / "Figure 2." captions, step 2 emphasised, code blocks with filename bar, language, line numbers, lines 3 and 8 highlighted, diff lines, Copy → "Copied", heading `#` on hover, author card. Then narrow the window under 640px: section bar appears after the title, timeline steps, edge-to-edge code. Stop the preview.

**Step 8: Commit**

```bash
git add -A
git commit -m "Add post page with side menu, section bar, progress and code copy" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 13: Discuss block and giscus comments

**Files:**
- Modify: `src/components/Discuss.astro`
- Create: `public/giscus/light.css`, `public/giscus/dark.css`, `public/_headers`, `giscus.json`

**Step 1: `src/components/Discuss.astro`**

```astro
---
import { GISCUS, SITE } from '../lib/site';

interface Props {
  threadId: string;
  discuss?: { devto?: string; linkedin?: string };
}
const { threadId, discuss = {} } = Astro.props;
const comments = Boolean(GISCUS.repoId && GISCUS.categoryId);
const shared = Boolean(discuss.devto || discuss.linkedin);
---
{(comments || shared) && (
  <section class="discuss" aria-labelledby="discuss-h">
    <h2 id="discuss-h">Discuss</h2>
    {comments && <p>Comment below with your GitHub account.</p>}
    {shared && (
      <>
        <p>You can also join the conversation where this post was shared.</p>
        <div class="btn-row">
          {discuss.devto && <a class="btn" href={discuss.devto} data-event="discuss_click" data-event-label="devto">Discuss on dev.to</a>}
          {discuss.linkedin && <a class="btn" href={discuss.linkedin} data-event="discuss_click" data-event-label="linkedin">Discuss on LinkedIn</a>}
        </div>
      </>
    )}
    {comments && (
      <giscus-comments
        data-repo={GISCUS.repo}
        data-repo-id={GISCUS.repoId}
        data-category={GISCUS.category}
        data-category-id={GISCUS.categoryId}
        data-term={threadId}
        data-theme-base={`${SITE.url}/giscus`}
      >
        <div class="giscus"></div>
        <p class="giscus-fallback" hidden>Comments couldn't load. <a href={`${SITE.links.repo}/discussions`}>Open the discussions on GitHub</a>.</p>
      </giscus-comments>
    )}
  </section>
)}

<script>
  class GiscusComments extends HTMLElement {
    connectedCallback() {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer.disconnect();
            this.load();
          }
        },
        { rootMargin: '600px 0px' },
      );
      observer.observe(this);
      addEventListener('themechange', () => this.syncTheme());
    }

    themeUrl() {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      return `${this.dataset.themeBase}/${theme}.css`;
    }

    load() {
      const script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      const attributes: Record<string, string> = {
        repo: this.dataset.repo ?? '',
        'repo-id': this.dataset.repoId ?? '',
        category: this.dataset.category ?? '',
        'category-id': this.dataset.categoryId ?? '',
        mapping: 'specific',
        term: this.dataset.term ?? '',
        strict: '1',
        'reactions-enabled': '1',
        'emit-metadata': '0',
        'input-position': 'top',
        theme: this.themeUrl(),
        lang: 'en',
        loading: 'lazy',
      };
      for (const [name, value] of Object.entries(attributes)) script.setAttribute(`data-${name}`, value);
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.addEventListener('error', () => {
        const fallback = this.querySelector<HTMLElement>('.giscus-fallback');
        if (fallback) fallback.hidden = false;
      });
      this.append(script);
    }

    syncTheme() {
      const frame = this.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
      frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme: this.themeUrl() } } }, 'https://giscus.app');
    }
  }
  customElements.define('giscus-comments', GiscusComments);
</script>
```

**Step 2: giscus theme files.** Start from giscus' own MIT-licensed themes, then append brand overrides (later declarations win).

```bash
mkdir -p public/giscus
curl -fsSL https://raw.githubusercontent.com/giscus/giscus/main/styles/themes/light.css -o public/giscus/light.css
curl -fsSL https://raw.githubusercontent.com/giscus/giscus/main/styles/themes/dark.css -o public/giscus/dark.css
cat >> public/giscus/light.css <<'EOF'

/* zohdi.me brand overrides */
main {
  --color-canvas-default: #ffffff;
  --color-canvas-overlay: #ffffff;
  --color-canvas-inset: #eef0f3;
  --color-canvas-subtle: #eef0f3;
  --color-border-default: #dde2ea;
  --color-border-muted: #dde2ea;
  --color-fg-default: #23272e;
  --color-fg-muted: #5a6372;
  --color-fg-subtle: #5a6372;
  --color-accent-fg: #1d3db0;
  --color-accent-emphasis: #1d3db0;
  --color-btn-primary-bg: #1d3db0;
  --color-btn-primary-hover-bg: #172f8a;
  --color-btn-primary-text: #ffffff;
}
EOF
cat >> public/giscus/dark.css <<'EOF'

/* zohdi.me brand overrides */
main {
  --color-canvas-default: #161d45;
  --color-canvas-overlay: #161d45;
  --color-canvas-inset: #0e1330;
  --color-canvas-subtle: #0e1330;
  --color-border-default: #2a3363;
  --color-border-muted: #2a3363;
  --color-fg-default: #e8ebf5;
  --color-fg-muted: #a3acc4;
  --color-fg-subtle: #a3acc4;
  --color-accent-fg: #9db0ff;
  --color-accent-emphasis: #3858e4;
  --color-btn-primary-bg: #3858e4;
  --color-btn-primary-hover-bg: #2f4bc4;
  --color-btn-primary-text: #ffffff;
}
EOF
head -3 public/giscus/light.css
```

Expected: the first lines are giscus' CSS (not an HTML error page). If `curl` is blocked, download the files from https://github.com/giscus/giscus/tree/main/styles/themes in a browser.

**Step 3: `public/_headers`**

```
/giscus/*
  Access-Control-Allow-Origin: https://giscus.app

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

**Step 4: `giscus.json`** (repo root; giscus reads it from the discussions repo)

```json
{
  "origins": ["https://blog.zohdi.me"],
  "originsRegex": ["http://localhost:[0-9]+"]
}
```

**Step 5: Build** — `SHOW_DRAFTS=1 npx astro build`. With empty `GISCUS` ids and no `discuss` links, the showcase renders no Discuss section; that is correct until Task 27. To eyeball it now, temporarily add to the showcase frontmatter:

```yaml
discuss:
  devto: https://dev.to/
  linkedin: https://www.linkedin.com/
```

…build, check the two buttons render, then remove the lines again.

**Step 6: Commit**

```bash
git add -A
git commit -m "Add Discuss block and lazy giscus comments with brand themes" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 14: Tags pages

**Files:**
- Create: `src/pages/tags/index.astro`, `src/pages/tags/[tag].astro`

**Step 1: `src/pages/tags/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { buildFeed, collectTags } from '../../lib/feed';
import { getElsewhere, getPosts } from '../../lib/posts';

const tags = collectTags(buildFeed(await getPosts(), await getElsewhere()));
---
<BaseLayout title="Tags" description="Every topic on the Zohdi blog." current="tags">
  <main class="container" id="content">
    <section class="intro">
      <h1>Tags</h1>
      <p>Every topic, with how many posts and talks use it.</p>
    </section>
    <ul class="tag-list">
      {tags.map(({ tag, count }) => <li><a href={`/tags/${tag}/`}>{tag}<span>{count}</span></a></li>)}
    </ul>
  </main>
</BaseLayout>
```

**Step 2: `src/pages/tags/[tag].astro`**

```astro
---
import EntryList from '../../components/EntryList.astro';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { buildFeed, collectTags, withTag } from '../../lib/feed';
import { getElsewhere, getPosts } from '../../lib/posts';

export async function getStaticPaths() {
  const feed = buildFeed(await getPosts(), await getElsewhere());
  return collectTags(feed).map(({ tag }) => ({ params: { tag }, props: { items: withTag(feed, tag) } }));
}

const { tag } = Astro.params;
const { items } = Astro.props;
---
<BaseLayout title={`Tagged “${tag}”`} description={`Posts and talks about ${tag}.`} current="tags">
  <main class="container" id="content">
    <a class="back" href="/tags/"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>All tags</a>
    <section class="intro"><h1>Tagged “{tag}”</h1></section>
    <div class="home-grid single"><EntryList items={items} /></div>
  </main>
</BaseLayout>
```

**Step 3: Build** — `npx astro build`; expect `dist/tags/index.html`, `dist/tags/vue/index.html`, `dist/tags/talks/index.html`.

**Step 4: Commit**

```bash
git add -A
git commit -m "Add tags index and tag pages" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 15: 404 page

**Files:**
- Create: `src/pages/404.astro`

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Page not found" description="This page doesn't exist." noindex>
  <main class="container" id="content">
    <section class="intro">
      <h1>Page not found</h1>
      <p>The link may be old, or the post may have moved. Start from the list of posts.</p>
    </section>
    <p><a class="btn" href="/">Go to all posts</a></p>
  </main>
</BaseLayout>
```

Build (`npx astro build`), expect `dist/404.html`. Commit:

```bash
git add -A
git commit -m "Add 404 page" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 16: Open Graph images

**Files:**
- Create: `src/pages/og/[slug].png.ts`

**Step 1: Endpoint**

```ts
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
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
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
```

**Step 2: Build and look**

Run: `SHOW_DRAFTS=1 npx astro build && open dist/og/home.png dist/og/showcase.png`
Expected: two 1200×630 PNGs with the Z mark, "Zohdi blog", the title in Alexandria, "Mahmoud Zohdi" and "blog.zohdi.me" along the bottom, blue top border.

**Step 3: Commit**

```bash
git add -A
git commit -m "Generate Open Graph images at build" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 17: RSS feed with full post content

**Files:**
- Create: `src/pages/rss.xml.ts`

**Step 1: Endpoint**

```ts
import rss from '@astrojs/rss';
import { getContainerRenderer as getMDXRenderer } from '@astrojs/mdx/container-renderer';
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { render } from 'astro:content';
import { transform, walk } from 'ultrahtml';
import sanitize from 'ultrahtml/transformers/sanitize';
import { getPosts } from '../lib/posts';
import { SITE } from '../lib/site';

const absolute = (value: string, site: URL) => (value.startsWith('/') && !value.startsWith('//') ? new URL(value, site).href : value);

export async function GET(context: APIContext) {
  const site = context.site ?? new URL(SITE.url);
  const container = await AstroContainer.create({ renderers: await loadRenderers([getMDXRenderer()]) });
  const items = [];

  for (const post of await getPosts()) {
    const { Content } = await render(post);
    const raw = (await container.renderToString(Content)).replace(/^<!DOCTYPE html>/i, '');
    const content = await transform(raw, [
      async (tree) => {
        await walk(tree, (node: any) => {
          const attrs = node.attributes as Record<string, string> | undefined;
          if (!attrs) return;
          for (const name of ['href', 'src']) if (typeof attrs[name] === 'string') attrs[name] = absolute(attrs[name], site);
          if (typeof attrs.srcset === 'string') {
            attrs.srcset = attrs.srcset
              .split(',')
              .map((part) => {
                const [url, size] = part.trim().split(/\s+/);
                return [absolute(url, site), size].filter(Boolean).join(' ');
              })
              .join(', ');
          }
        });
        return tree;
      },
      // Keep custom elements (StackBlitz link lives inside one); drop scripts, styles and buttons.
      sanitize({ dropElements: ['script', 'style', 'button'], allowCustomElements: true }),
    ]);
    items.push({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/${post.id}/`,
      categories: post.data.tags,
      content,
    });
  }

  return rss({
    title: SITE.title,
    description: SITE.description,
    site,
    items,
    customData: '<language>en</language>',
  });
}
```

**Step 2: Build and check**

```bash
SHOW_DRAFTS=1 npx astro build
grep -c '<item>' dist/rss.xml
grep -o 'https://blog.zohdi.me/showcase/' dist/rss.xml | head -1
grep -c '<script' dist/rss.xml || true
```

Expected: `1` item (only the showcase draft exists), the absolute link appears, `0` script tags. Look inside `dist/rss.xml` for the code block HTML and the "Open on StackBlitz" link.

If `astro:container` or `@astrojs/mdx/container-renderer` fails to import, check the current Astro docs ("Container API" and "@astrojs/mdx") with `npx ctx7@latest docs /withastro/docs "container API render MDX content to string in endpoint"` before changing anything. The fallback in the design is summary-only RSS: remove `content` from the items.

**Step 3: Commit**

```bash
git add -A
git commit -m "Add RSS feed with full post content" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 18: Content check script (TDD)

**Files:**
- Create: `scripts/lib/content.test.mjs`, `scripts/lib/content.mjs`, `scripts/check-content.mjs`

**Step 1: Failing test** — `scripts/lib/content.test.mjs`

```js
import { describe, expect, it } from 'vitest';
import { findProblems, parseFrontmatter } from './content.mjs';

describe('parseFrontmatter', () => {
  it('reads YAML between the first two --- lines', () => {
    expect(parseFrontmatter('---\ntitle: Hi\ndraft: true\n---\nBody')).toEqual({ title: 'Hi', draft: true });
  });

  it('throws when there is no frontmatter', () => {
    expect(() => parseFrontmatter('# Just text')).toThrow('missing frontmatter');
  });
});

describe('findProblems', () => {
  it('accepts unique slugs and thread ids', () => {
    expect(findProblems([{ slug: 'a', data: { threadId: 'a' } }, { slug: 'b', data: { threadId: 'b' } }])).toEqual([]);
  });

  it('reports a duplicate threadId', () => {
    expect(findProblems([{ slug: 'a', data: { threadId: 'x' } }, { slug: 'b', data: { threadId: 'x' } }])).toEqual([
      'b: threadId "x" is also used by a',
    ]);
  });

  it('reports reserved and badly formed slugs', () => {
    expect(findProblems([{ slug: 'tags', data: { threadId: 't' } }, { slug: 'My_Post', data: { threadId: 'm' } }])).toEqual([
      'tags: slug is reserved',
      'My_Post: slug must be lowercase letters, digits and dashes',
    ]);
  });
});
```

**Step 2: Run** — `npx vitest run scripts/lib/content.test.mjs` → FAIL.

**Step 3: Implement** — `scripts/lib/content.mjs`

```js
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';

/** Slugs that would collide with site routes. */
export const RESERVED_SLUGS = ['tags', 'og', 'home', '404', 'giscus', 'rss.xml'];

export function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing frontmatter');
  return parse(match[1]) ?? {};
}

/** Reads every src/content/posts/<slug>/index.mdx. */
export async function readPosts(dir) {
  const folders = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  return Promise.all(
    folders.map(async (slug) => ({ slug, data: parseFrontmatter(await readFile(join(dir, slug, 'index.mdx'), 'utf8')) })),
  );
}

export function findProblems(posts) {
  const problems = [];
  const threads = new Map();
  for (const { slug, data } of posts) {
    if (RESERVED_SLUGS.includes(slug)) problems.push(`${slug}: slug is reserved`);
    else if (!/^[a-z0-9-]+$/.test(slug)) problems.push(`${slug}: slug must be lowercase letters, digits and dashes`);
    const id = data.threadId;
    if (!id) continue;
    if (threads.has(id)) problems.push(`${slug}: threadId "${id}" is also used by ${threads.get(id)}`);
    else threads.set(id, slug);
  }
  return problems;
}
```

**Step 4: Run** — expected PASS (5 tests).

**Step 5: `scripts/check-content.mjs`**

```js
import { findProblems, readPosts } from './lib/content.mjs';

const posts = await readPosts('src/content/posts');
const problems = findProblems(posts);
if (problems.length > 0) {
  console.error(`Content check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
const drafts = posts.filter((p) => p.data.draft).length;
console.log(`Content check passed: ${posts.length} posts (${drafts} drafts).`);
```

Run: `npm run check:content` → `Content check passed: 1 posts (1 drafts).`

**Step 6: Commit**

```bash
git add -A
git commit -m "Add content check for reserved slugs and duplicate thread ids" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 19: Built-site check script (TDD)

**Files:**
- Create: `scripts/lib/links.test.mjs`, `scripts/lib/links.mjs`, `scripts/check-dist.mjs`

**Step 1: Failing test** — `scripts/lib/links.test.mjs`

```js
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
```

**Step 2: Run** — `npx vitest run scripts/lib/links.test.mjs` → FAIL.

**Step 3: Implement** — `scripts/lib/links.mjs`

```js
/** Root-relative refs (and refs to our own origin) found in href, src, srcset and content attributes. */
export function localRefs(html, origin) {
  const raw = [];
  for (const m of html.matchAll(/\s(?:href|src|content)="([^"]+)"/g)) raw.push(m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) for (const part of m[1].split(',')) raw.push(part.trim().split(/\s+/)[0]);
  const refs = new Set();
  for (let ref of raw) {
    if (ref.startsWith(origin)) ref = ref.slice(origin.length) || '/';
    if (!ref.startsWith('/') || ref.startsWith('//')) continue;
    const path = ref.split(/[?#]/)[0];
    if (path) refs.add(path);
  }
  return [...refs];
}

export function candidates(ref) {
  const path = decodeURIComponent(ref);
  if (path.endsWith('/')) return [`${path}index.html`];
  return [path, `${path}/index.html`, `${path}.html`];
}

/** pages: [{ file, html }]; exists(pathInDist) → boolean */
export function findBroken(pages, exists, origin) {
  const broken = [];
  for (const { file, html } of pages) {
    for (const ref of localRefs(html, origin)) {
      if (!candidates(ref).some(exists)) broken.push({ file, ref });
    }
  }
  return broken;
}
```

**Step 4: Run** — expected PASS (3 tests).

**Step 5: `scripts/check-dist.mjs`**

```js
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readPosts } from './lib/content.mjs';
import { findBroken } from './lib/links.mjs';

const DIST = 'dist';
const ORIGIN = 'https://blog.zohdi.me';

const htmlFiles = (await readdir(DIST, { recursive: true })).filter((f) => f.endsWith('.html')).map((f) => join(DIST, f));
const pages = await Promise.all(htmlFiles.map(async (file) => ({ file, html: await readFile(file, 'utf8') })));
const problems = findBroken(pages, (p) => existsSync(join(DIST, p)), ORIGIN).map(({ file, ref }) => `${file}: broken link ${ref}`);

if (process.env.SHOW_DRAFTS !== '1') {
  for (const { slug, data } of await readPosts('src/content/posts')) {
    if (data.draft && existsSync(join(DIST, slug))) problems.push(`draft "${slug}" was published to dist/${slug}/`);
  }
}

if (problems.length > 0) {
  console.error(`Built-site check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`Built-site check passed: ${pages.length} pages, no broken links, no drafts.`);
```

**Step 6: Run the whole build gate**

Run: `npm run build`
Expected: content check, `astro check` (0 errors), all unit tests, `astro build`, and "Built-site check passed". Fix any `astro check` type errors before moving on.

Then prove the gate catches problems:
1. `SHOW_DRAFTS=1 npx astro build && node scripts/check-dist.mjs` → fails with `draft "showcase" was published`.
2. `npm run build` again to restore a clean `dist/`.

**Step 7: Commit**

```bash
git add -A
git commit -m "Add built-site check for broken links and leaked drafts" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 20: Export for cross-posting (TDD) and CROSSPOST.md

**Files:**
- Create: `scripts/lib/to-markdown.test.mjs`, `scripts/lib/to-markdown.mjs`, `scripts/export.mjs`, `CROSSPOST.md`

**Step 1: Failing test** — `scripts/lib/to-markdown.test.mjs`

````js
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
````

**Step 2: Run** — `npx vitest run scripts/lib/to-markdown.test.mjs` → FAIL.

**Step 3: Implement** — `scripts/lib/to-markdown.mjs`

````js
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
````

**Step 4: Run** — expected PASS (7 tests). If one fails only on blank-line spacing, fix the implementation's whitespace handling, not the expectation.

**Step 5: `scripts/export.mjs`**

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseFrontmatter } from './lib/content.mjs';
import { devtoFrontmatter, toMarkdown } from './lib/to-markdown.mjs';

const SITE = 'https://blog.zohdi.me';
const RAW = 'https://raw.githubusercontent.com/mahmoudzohdi/blog/main/src/content/posts';
const PLATFORMS = ['devto', 'hashnode', 'medium'];

const [slug, platform = 'devto'] = process.argv.slice(2);
if (!slug || !PLATFORMS.includes(platform)) {
  console.error('Usage: npm run export -- <slug> [devto|hashnode|medium]');
  process.exit(1);
}

const source = await readFile(`src/content/posts/${slug}/index.mdx`, 'utf8');
const data = parseFrontmatter(source);
const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const canonical = `${SITE}/${slug}/`;
const tracked = `${canonical}?utm_source=${platform}`;

const head = platform === 'devto' ? devtoFrontmatter(data, { canonical, cover: `${SITE}/og/${slug}.png` }) : `# ${data.title}\n\n`;
const markdown = toMarkdown(body, { postUrl: tracked, assetBase: `${RAW}/${slug}` });
const footer = `\n---\n\n*Originally published on [blog.zohdi.me](${tracked}), where you can also leave a comment.*\n`;

await mkdir('export', { recursive: true });
const file = `export/${slug}.${platform}.md`;
await writeFile(file, head + markdown + footer);
console.log(`Wrote ${file}\nCanonical URL: ${canonical}`);
```

Run: `npm run export -- showcase devto && sed -n 1,30p export/showcase.devto.md`
Expected: dev.to frontmatter, quotes for callouts, the steps list, absolute image URL, cleaned code fences, StackBlitz link, footer.

**Step 6: `CROSSPOST.md`**

```markdown
# Cross-posting checklist

Do these in order for every new post. The blog is always the original (canonical) copy.

1. **Publish here.** Set `draft: false`, push to `main`, wait for the deploy, open the live URL.
2. **Ask Google to index it.** Search Console → URL inspection → paste the URL → Request indexing.
3. **Wait 2–3 days** so search engines see the blog first.
4. **dev.to:** `npm run export -- <slug> devto`, open https://dev.to/new, paste `export/<slug>.devto.md`. The frontmatter already sets `canonical_url` and the cover. Preview, then publish.
5. **Hashnode:** `npm run export -- <slug> hashnode`, new post, paste the Markdown, set "Are you republishing? → original URL" to the blog URL, publish.
6. **Medium:** use Import a story (https://medium.com/p/import) with the blog URL. Medium sets the canonical link itself. Check code blocks and images, publish.
7. **LinkedIn:** a short native post (the main takeaway in 3–5 lines), then the link with `?utm_source=linkedin` as the first comment.
8. **Link back.** Add the dev.to and LinkedIn URLs to the post's `discuss:` frontmatter and push. "Discuss on …" buttons appear under the post.

Umami shows which platform sends readers (`utm_source`).
```

**Step 7: Commit**

```bash
git add -A
git commit -m "Add Markdown export for cross-posting and checklist" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 21: Worker config

**Files:**
- Create: `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  // Must match the Worker name in the Cloudflare dashboard, or Workers Builds fails.
  "name": "blog",
  "compatibility_date": "2026-10-01",

  // Static site only, no Worker code. Only blog.zohdi.me serves it.
  "workers_dev": false,
  "preview_urls": false,
  "routes": [{ "pattern": "blog.zohdi.me", "custom_domain": true }],

  // Astro writes /slug/index.html; /slug redirects to /slug/. Unknown paths get dist/404.html.
  "assets": { "directory": "./dist", "not_found_handling": "404-page", "html_handling": "auto-trailing-slash" }
}
```

Check it parses: `npx wrangler deploy --dry-run` → reads the config and lists the assets without uploading. Do **not** run a real deploy (Task 29).

Commit:

```bash
git add wrangler.jsonc
git commit -m "Add Cloudflare Worker config for static assets" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 22: End-to-end tests

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/post.spec.ts`, `tests/e2e/theme.spec.ts`, `tests/e2e/site.spec.ts`

**Step 1: `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  webServer: {
    // Test build includes the showcase draft
    command: 'npm run build:test && npm run preview',
    url: 'http://localhost:4321/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: { baseURL: 'http://localhost:4321' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
});
```

Install the browser once: `npx playwright install chromium`.

**Step 2: `tests/e2e/home.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('lists writing and talks grouped by year', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notes from building for the web');
  await expect(page.getByRole('heading', { level: 2, name: '2019' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Login First/ })).toHaveAttribute('href', /medium\.com/);
});

test('topic filter shows only matching entries', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'talks', exact: true }).click();
  await expect(page.getByRole('link', { name: /live prototype/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Login First/ })).toBeHidden();
  await expect(page).toHaveURL(/\?topic=talks/);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByRole('link', { name: /Login First/ })).toBeVisible();
});

test('no page scrolls sideways', async ({ page }) => {
  for (const path of ['/', '/showcase/', '/tags/', '/tags/vue/']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('phone menu opens the navigation', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone layout only');
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#m-nav').getByRole('link', { name: 'Tags' })).toBeVisible();
});
```

**Step 3: `tests/e2e/post.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/showcase/');
});

test('renders the header and every component', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Component showcase');
  await expect(page.locator('.meta')).toContainText(/\d+ min read/);
  await expect(page.locator('.callout')).toHaveCount(3);
  await expect(page.locator('.flow[data-highlight="2"] li')).toHaveCount(4);
  await expect(page.locator('figure.code-block')).toHaveCount(3);
  await expect(page.locator('.code-title').first()).toHaveText('store/modules/auth.js');
  await expect(page.locator('.line.highlighted')).toHaveCount(2);
  await expect(page.locator('.line.diff.add')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Open on StackBlitz' })).toBeVisible();
});

test('adds # links to headings', async ({ page }) => {
  await expect(page.locator('h2#text a.anchor')).toHaveAttribute('href', '#text');
});

test('copy button copies code without removed lines', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const button = page.locator('figure.code-block').nth(1).getByRole('button', { name: 'Copy code' });
  await button.click();
  await expect(button).toHaveText('Copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('window.umami?.track(name)');
  expect(copied).not.toContain('window.umami.track(name)');
});

test('side menu follows the current section', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop layout only');
  await page.evaluate(() => document.getElementById('flows-and-figures')?.scrollIntoView());
  await expect(page.locator('.toc a[href="#flows-and-figures"]')).toHaveAttribute('aria-current', 'true');
});

test('section bar appears after the title on phones', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone layout only');
  const bar = page.locator('[data-secbar]');
  await expect(bar).not.toHaveClass(/show/);
  await page.evaluate(() => document.getElementById('flows-and-figures')?.scrollIntoView());
  await expect(bar).toHaveClass(/show/);
  await expect(bar.locator('[data-secbar-cur]')).toHaveText('Flows and figures');
  await bar.getByRole('button').click();
  await expect(page.locator('#secbar-list')).toBeVisible();
});
```

**Step 4: `tests/e2e/theme.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('follows the system setting by default', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('remembers the chosen theme across reloads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('sets the theme before any stylesheet', async ({ page }) => {
  await page.goto('/');
  const order = await page.evaluate(() => {
    const head = [...document.head.children];
    const script = head.findIndex((el) => el.tagName === 'SCRIPT' && (el.textContent ?? '').includes("localStorage.getItem('theme')"));
    const style = head.findIndex((el) => el.tagName === 'STYLE' || (el.tagName === 'LINK' && (el as HTMLLinkElement).rel === 'stylesheet'));
    return { script, style };
  });
  expect(order.script).toBeGreaterThanOrEqual(0);
  expect(order.script).toBeLessThan(order.style);
});
```

**Step 5: `tests/e2e/site.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('unknown pages show the 404 page', async ({ page }) => {
  const response = await page.goto('/no-such-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
});

test('posts carry canonical, Open Graph and JSON-LD tags', async ({ page }) => {
  await page.goto('/showcase/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://blog.zohdi.me/showcase/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://blog.zohdi.me/og/showcase.png');
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
  expect(jsonLd['@type']).toBe('BlogPosting');
  expect(jsonLd.author['@id']).toBe('https://zohdi.me/#person');
});

test('serves the OG image and the RSS feed', async ({ request }) => {
  const og = await request.get('/og/showcase.png');
  expect(og.headers()['content-type']).toContain('image/png');
  const xml = await (await request.get('/rss.xml')).text();
  expect(xml).toContain('https://blog.zohdi.me/showcase/');
  expect(xml).not.toContain('<script');
});
```

**Step 6: Run**

Run: `npm run test:e2e`
Expected: all tests pass on both projects (tests marked desktop-only or phone-only are skipped on the other). If the 404 test gets status 200 because `astro preview` doesn't serve `404.html` with a 404 status, relax that one assertion to only check the heading and note it in the commit message; Cloudflare's `not_found_handling: "404-page"` returns 404 in production.

**Step 7: Commit**

```bash
git add -A
git commit -m "Add end-to-end tests for home, post, theme and site metadata" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 23: Accessibility tests

**Files:**
- Create: `tests/e2e/a11y.spec.ts`

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const path of ['/', '/showcase/', '/tags/', '/no-such-page/']) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${path} has no serious accessibility problems (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('giscus-comments')
        .analyze();
      const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });
  }
}
```

Run: `npx playwright test tests/e2e/a11y.spec.ts`
Expected: pass. If colour contrast fails, fix the token in `src/styles/tokens.css` (keep the brand hue, adjust lightness) rather than excluding the rule. Re-run until clean.

Commit:

```bash
git add -A
git commit -m "Add axe accessibility checks in light and dark" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 24: CI workflow and README

**Files:**
- Create: `.github/workflows/ci.yml`, `README.md`

**Step 1: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 7
```

**Step 2: `README.md`**

```markdown
# blog.zohdi.me

Mahmoud Zohdi's blog. Astro 7, static, served by a Cloudflare Worker.

## Write

- New post: `src/content/posts/<slug>/index.mdx` (images in the same folder). Copy the frontmatter from `src/content/posts/showcase/index.mdx`.
- Start with `draft: true`. Drafts show in `npm run dev`, never on the live site.
- Components: `import { Callout, Figure, Steps, StackBlitz } from '@/components/mdx';` — see the showcase draft for every option.
- Code fences: ```` ```js title="file.js" {3,8} ````, and `// [!code ++]` / `// [!code --]` for diffs.
- Talks and posts published elsewhere: `src/content/elsewhere.yaml`.
- Slugs and `threadId` never change after publishing (comments and links depend on them). If a slug must change, add a line to `public/_redirects`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local site with drafts at http://localhost:4321 |
| `npm run build` | Full gate: content check, type check, unit tests, build, link/draft check |
| `npm run test:e2e` | Playwright + axe against a test build (includes the showcase draft) |
| `npm run export -- <slug> [devto\|hashnode\|medium]` | Markdown for cross-posting, see `CROSSPOST.md` |

Pushing to `main` deploys through Cloudflare Workers Builds (build command `npm run build`). A failing build does not deploy.
```

**Step 3: Commit**

```bash
git add -A
git commit -m "Add CI workflow and README" -m "Claude-Session: https://claude.ai/code/session_01LSzNQXCtu8sp9KThuRmprK"
```

---

### Task 25: Full verification and user review (checkpoint)

**Step 1:** `npm run build` → every step passes.
**Step 2:** `npm run test:e2e` → all pass.
**Step 3:** Screenshots for the user (save in the session scratchpad, not the repo): home and showcase at 1280 px and 390 px, light and dark, e.g. with `npx playwright screenshot --viewport-size=1280,900 http://localhost:4321/ <scratch>/home-desktop.png` against `npm run build:test && npm run preview:test`.
**Step 4:** Show the user the screenshots next to the mockup and list any differences. **STOP. Wait for the user's OK before Task 26.**

---

## Launch (every step needs the user's explicit OK)

### Task 26: Create the public GitHub repo and push

1. Ask the user: "Create the public repo `mahmoudzohdi/blog` and push `main`?" Wait for yes.
2. Create the empty public repo `mahmoudzohdi/blog` (description "Mahmoud Zohdi's blog at blog.zohdi.me", homepage https://blog.zohdi.me), add it as `origin`, and push `main`.
3. Confirm the first CI run on GitHub passes.

### Task 27: Turn on giscus

User steps (browser):
1. Repo → Settings → General → Features → enable **Discussions**.
2. Discussions → categories → create **Comments**, type **Announcements** (only maintainers and giscus can start threads).
3. Install the giscus app on the repo: https://github.com/apps/giscus.
4. On https://giscus.app enter `mahmoudzohdi/blog`, choose category "Comments", copy `data-repo-id` and `data-category-id`.

Then: put both ids into `GISCUS` in `src/lib/site.ts`, `npm run build`, commit "Turn on giscus comments", and push after the user's OK.

### Task 28: Umami website

User step: Umami Cloud → Add website → name "blog", domain `blog.zohdi.me` → copy the website ID.
Then: set `UMAMI_WEBSITE_ID` in `src/lib/site.ts`, build, commit "Add Umami analytics", push after OK.

### Task 29: Deploy to Cloudflare and switch the domain

Wrangler is already logged in on this Mac. Each numbered step waits for the user.

1. **User:** in Cloudflare DNS for `zohdi.me`, delete the `blog` CNAME (→ `hashnode.network`). A Worker custom domain cannot be created while that record exists. The Hashnode blog is empty, so nothing is lost.
2. **Claude, after OK:** `npm run deploy` (build gate + `wrangler deploy`). This creates the Worker `blog` and the custom domain with its certificate.
3. Check: `curl -sI https://blog.zohdi.me/ | head -1` → `200`; `curl -sI https://blog.zohdi.me/nope/ | head -1` → `404`; `curl -sI https://blog.zohdi.me/giscus/light.css | grep -i access-control` → `https://giscus.app`; `curl -sI https://blog.zohdi.me/showcase/ | head -1` → `404` (draft not published).
4. **User:** Workers & Pages → `blog` → Settings → Build → connect `mahmoudzohdi/blog`, production branch `main`, build command `npm run build`, deploy command `npx wrangler deploy`; under Branch control turn **off** preview builds. Node comes from `.node-version` (24).
5. Push a trivial commit (e.g. README wording) with the user's OK, and confirm the Workers Builds run deploys. With the user's OK, push a commit to `main` that deliberately breaks the build (e.g. an invalid frontmatter field in the showcase draft), confirm Workers Builds fails and the live site is unchanged, then revert and push.

### Task 30: Hashnode and Search Console

User steps:
1. Hashnode → blog settings → Domain → remove `blog.zohdi.me` (or delete the empty Hashnode blog).
2. Google Search Console → Add property → **Domain** → `zohdi.me` → add the TXT record in Cloudflare DNS → Verify. This covers zohdi.me, blog and talks.
3. Search Console → Sitemaps → submit `https://blog.zohdi.me/sitemap-index.xml`.

### Task 31: "Blog" link on zohdi.me (propose first)

zohdi.me is a single `index.html` on the `gh-pages` branch of `mahmoudzohdi/zohdi.me`.
1. Propose the exact change (a "Blog" link to `https://blog.zohdi.me/` in the nav and footer, wording and position) and show it to the user. **Wait for OK.**
2. Only then edit, commit and push `gh-pages` in the zohdi.me repo.

---

## After launch

The first real post goes through `CROSSPOST.md`. Out of scope until asked: search, newsletter, accent switcher, Arabic version, cross-post automation.
