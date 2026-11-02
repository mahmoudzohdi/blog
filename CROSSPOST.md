# Cross-posting checklist

Do these in order for every new post. The blog is always the original (canonical) copy.

1. **Publish here.** Set `draft: false`, push to `main`, wait for the deploy, open the live URL.
2. **Ask Google to index it.** Search Console → URL inspection → paste the URL → Request indexing.
3. **Wait 2–3 days** so search engines see the blog first.
4. **dev.to:** `npm run export -- <slug> devto`, open https://dev.to/new, paste `export/<slug>.devto.md`. The frontmatter already sets `canonical_url` and the cover. Preview, then publish.
5. **Hashnode:** `npm run export -- <slug> hashnode`, new post, paste the Markdown, set "Are you republishing? → original URL" to the blog URL, publish.
6. **Medium:** Stories → Import a story (currently https://medium.com/p/import) with the blog URL. Medium sets the canonical link itself. Check code blocks and images, publish.
7. **LinkedIn:** a short native post (the main takeaway in 3–5 lines), then the link with `?utm_source=linkedin` as the first comment.
8. **Link back.** Add the dev.to and LinkedIn URLs to the post's `discuss:` frontmatter and push. "Discuss on …" buttons appear under the post.

Umami shows which platform sends readers (`utm_source`).
