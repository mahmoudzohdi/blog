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

  it('ignores code fences', () => {
    const body = ['```js', words(2000), '```', words(549)].join('\n\n');
    expect(readingMinutes(body)).toBe(2);
  });

  it('ignores import lines', () => {
    const body = ["import { Callout } from '@/components/mdx';", words(549)].join('\n\n');
    expect(readingMinutes(body)).toBe(2);
  });

  it('ignores component tags', () => {
    const body = ['<Callout type="note" id="x" class="y">', words(549), '</Callout>'].join('\n\n');
    expect(readingMinutes(body)).toBe(2);
  });
});
