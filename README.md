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
| `npm run build:test && npm run preview:test` | Test build with drafts (showcase) at http://localhost:4321 |
| `npm run export -- <slug> [devto\|hashnode\|medium]` | Markdown for cross-posting, see `CROSSPOST.md` |

Pushing to `main` deploys through Cloudflare Workers Builds (build command `npm run build`). A failing build does not deploy.
