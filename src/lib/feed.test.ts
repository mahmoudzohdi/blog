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
