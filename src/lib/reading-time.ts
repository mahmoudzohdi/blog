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
