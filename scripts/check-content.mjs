import { findProblems, readContent, readElsewhere } from './lib/content.mjs';

const { posts, fixtures } = await readContent('src/content');
const problems = findProblems(posts, fixtures);
// Astro only logs invalid YAML and keeps building, so fail here instead.
try {
  await readElsewhere('src/content/elsewhere.yaml');
} catch (err) {
  problems.push(`elsewhere.yaml: ${err.message}`);
}
if (problems.length > 0) {
  console.error(`Content check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
const drafts = posts.filter((p) => p.data.draft).length;
const fixtureCount = `${fixtures.length} fixture${fixtures.length === 1 ? '' : 's'}`;
console.log(`Content check passed: ${posts.length} posts (${drafts} drafts), ${fixtureCount}.`);
