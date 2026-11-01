# blog.zohdi.me — design

Date: 2026-11-01
Status: approved in brainstorming, ready for an implementation plan
Mockup: [2026-11-01-blog-mockup.html](2026-11-01-blog-mockup.html) (open in a browser; the dark bar at the bottom is mockup-only)

## Goal

A self-hosted, branded blog at `blog.zohdi.me` that matches zohdi.me and talks.zohdi.me, is calm to read, shows frontend craft, and acts as the canonical home for posts that are then cross-posted to dev.to, Hashnode, Medium and LinkedIn (publish on own site, syndicate elsewhere).

Today `blog.zohdi.me` is a Hashnode blog with no posts. The only published article is a 2019 Medium post, which stays on Medium.

## Decisions

| Topic | Decision |
|---|---|
| Location | `blog.zohdi.me`, its own site (not `zohdi.me/blog`) |
| v1 extras | Tags/topic pages, comments. Search later. Newsletter later (provider undecided, Kit leading) |
| Comments | giscus (GitHub Discussions), plus "Discuss on dev.to / LinkedIn" links |
| Writing | MDX in the editor, push to `main` deploys |
| Interactive widgets | Vanilla JS / web components. React/Vue added per post only when a teaching demo needs it |
| Repo | Public `mahmoudzohdi/blog`; giscus uses its Discussions |
| 2019 Medium post | Stays on Medium, listed as an "elsewhere" entry |
| Visual direction | "Quiet paper" (zohdi.me tokens, calm reading layout), widened, with the enhancements below |
| Accent | Blue only in the UI; faience/graphite tokens kept in CSS |
| Images | In git, next to each post; Astro optimises at build. R2 only for video or if the repo grows past a few hundred MB |

## 1. Architecture and hosting

- **Astro 7** (7.4.x; Node 24), static output, MDX integration, Shiki at build (talks' "blueprint" theme), no UI framework. Astro 7's default Markdown processor (Sätteri) runs no remark plugins, so reading time is computed from `entry.body`.
- **Fonts self-hosted** via `@fontsource` (Alexandria, IBM Plex Sans, IBM Plex Mono): no third-party requests.
- **Cloudflare Worker `blog`**, static assets only (`wrangler.jsonc` → `assets.directory: ./dist`), custom domain `blog.zohdi.me`, `workers_dev: false`, `preview_urls: false`. Same pattern as talks. No adapter.
- **Deploy:** Cloudflare Workers Builds (Git integration) on push to `main`. The Worker name in the dashboard must equal `name` in `wrangler.jsonc`.
- **Analytics:** Umami Cloud, new website for `blog.zohdi.me`, no cookies, one `track(name, data)` helper.
- **Cost:** $0.

## 2. Content model and URLs

Posts: `src/content/posts/<slug>/index.mdx` with images beside it.

```yaml
title: How the zohdi.me hero is composed
description: ≤160 chars, used in lists, meta and OG
pubDate: 2026-11-20
updatedDate: 2026-12-02      # optional
tags: [architecture, javascript]
threadId: zohdi-hero         # permanent; giscus mapping (not `id`, to avoid confusion with Astro's entry id)
draft: true                  # excluded from production builds
cover: ./cover.png           # optional OG override
discuss:                     # optional
  devto: https://dev.to/…
  linkedin: https://www.linkedin.com/…
```

Elsewhere entries: `src/content/elsewhere.yaml`

```yaml
- title: Create reusable “Login First” modal before the user action with Vue.js + Vuex
  url: https://medium.com/@mahmoud.zohdi/create-reusable-login-first-modal-before-the-user-action-with-vue-js-vuex-caa7038b352b
  date: 2019-10-24
  kind: article          # article | talk
  where: Medium
  tags: [vue, vuex]
- title: "Web development as a tool: turn your idea into a live prototype"
  url: https://talks.zohdi.me/nasa-space-apps-cairo-2026/
  date: 2026-10-30
  kind: talk
  where: NASA Space Apps Cairo
  tags: [talks]
```

URLs:

- Post `/<slug>/` (no `/posts/` prefix). Slugs never change after publishing; if one must, add a redirect.
- `/tags/`, `/tags/<tag>/`, `/rss.xml`, `/sitemap-index.xml`, `/robots.txt`, styled `404`.
- OG image per post at build, 1200×630, brand style (title, Z mark, blog.zohdi.me).
- RSS: aim for full post HTML (dev.to import needs it); interactive parts replaced by a link back. Confirm the rendering approach in the plan; fallback is summary + link.
- Reading time computed at build. Dates shown as `24 Oct 2019`.

## 3. Components

MDX (available in every post):

- `<Callout type="note|tip|warning">`
- `<Figure src caption>`: optimised image, auto-numbered caption
- `<Steps>`: numbered flow; row of boxes on desktop, vertical timeline on phones; `key` marks the important step
- Code fences: ```` ```js title="file.js" {3,8} ```` → filename bar, language label, line numbers, highlighted lines, diff lines, copy button (Shiki + `@shikijs/transformers`; confirm options in the plan)
- `<StackBlitz id>`: click to load, so no third-party frame or cookies until the reader asks
- Post-specific widgets: web components in the post folder

Site (from the mockup):

- Header (menu button on phones), theme toggle (system default, remembered choice, no-flash head script), footer ("Built with Astro, source on GitHub").
- Home: intro, topic filter, year groups, entries with Talk/Medium labels, about card with photo, Follow (RSS with copy URL, GitHub, LinkedIn).
- Post: back link, header (date, reading time, tags), 720 px reading column, desktop "On this page" side menu (active section, minutes left, Copy link, LinkedIn, Back to top), phone section bar (current section + progress, tap for list), top progress bar on desktop, heading `#` anchors, author card, Discuss block, giscus, next post.
- `<giscus-comments>`: lazy-loads near the viewport, follows the site theme, custom theme CSS served from blog.zohdi.me with `Access-Control-Allow-Origin: https://giscus.app` (set in `public/_headers`).
- Works without JS: everything readable, TOC links work, filter shows all. Only comments and copy buttons need JS.
- Accessibility: real buttons/links, visible focus, reduced motion respected, contrast checked in both themes.

Layout numbers: container max 1104 px; home = list + 280 px sidebar; post = 720 px column + 232 px side menu; side menu hidden below 1000 px (section bar instead); phone rules below 640 px (20 px gutter, full-bleed code, timeline steps, tags hidden in lists, swipeable topic filter).

## 4. SEO, sharing, cross-posting

- Per page: title, description, canonical, Open Graph + Twitter card, `article:*` dates and tags, JSON-LD `BlogPosting` with author = the Person on zohdi.me; RSS autodiscovery.
- Google Search Console: one Domain property for `zohdi.me` (DNS TXT) covers all subdomains (user step).
- zohdi.me gets a "Blog" link in nav and footer (propose, then deploy after OK).
- `npm run export <slug>` → `export/<slug>.md`: plain Markdown (Callout → quote, Steps → list, absolute image URLs, interactive → link) with dev.to frontmatter (`canonical_url`, tags, cover).
- Per post: publish → index request → wait 2–3 days → dev.to (paste export) → Hashnode (paste, "originally published at") → Medium (Import story) → LinkedIn native post, link in first comment → add URLs to `discuss:`. Back-links carry `?utm_source=devto|hashnode|medium|linkedin`. Checklist lives in `CROSSPOST.md`.
- Umami events: `copy_code`, `copy_link`, `share_linkedin`, `discuss_click`, `toc_click`, `filter_topic`, `theme_toggle`, `outbound`, `load_demo`.

## 5. Quality, testing, launch

Build gate (`npm run build`, also the Cloudflare build command): frontmatter schema, duplicate `threadId`/reserved slug check, `astro check`, unit tests, internal link and image check on `dist`, no drafts in output. Any failure means no deploy.

Tests:

- Vitest: reading time, posts + elsewhere merge/sort, year grouping, export conversions.
- Playwright on the built site: home filter, TOC/section bar tracking, theme toggle persistence without flash, copy buttons, 404, no horizontal scroll at 390 px, both themes.
- axe-core on home and post, light and dark: zero serious violations.
- GitHub Actions runs everything on push.

Runtime fallbacks: comments fail → message + GitHub discussion link; clipboard blocked → select text + "Press ⌘C"; storage blocked → system theme; Umami blocked → no-op; StackBlitz fails → open-in-new-tab link.

Launch:

1. Build locally to match the mockup.
2. Review with `npm run preview` (optional temporary workers.dev preview, then switched off).
3. Soft launch: custom domain on the Worker, remove domain in Hashnode, Umami website, Search Console (user steps).
4. First post (suggested: how the zohdi.me hero is composed) + announcement + first cross-post round.
5. "Blog" link on zohdi.me after OK.

Every public step waits for the user's confirmation.

## Out of scope for v1

Search (Pagefind), newsletter, accent switcher, comments system of our own, video hosting, Arabic version, scheduled cross-post automation.
