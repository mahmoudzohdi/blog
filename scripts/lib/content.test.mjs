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
