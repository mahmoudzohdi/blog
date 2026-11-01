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
