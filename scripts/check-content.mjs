import { findProblems, readPosts } from './lib/content.mjs';

const posts = await readPosts('src/content/posts');
const problems = findProblems(posts);
if (problems.length > 0) {
  console.error(`Content check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
const drafts = posts.filter((p) => p.data.draft).length;
console.log(`Content check passed: ${posts.length} posts (${drafts} drafts).`);
