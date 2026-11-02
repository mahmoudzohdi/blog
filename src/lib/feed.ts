import { postPath } from './urls';

export type FeedItem = {
  kind: 'post' | 'article' | 'talk';
  title: string;
  url: string;
  date: Date;
  description?: string;
  tags: string[];
  /** Where an external entry lives, e.g. "Medium". */
  where?: string;
  external: boolean;
  draft: boolean;
};

export type PostLike = {
  id: string;
  data: { title: string; description: string; pubDate: Date; tags: string[]; draft?: boolean };
};

export type ElsewhereLike = {
  data: {
    title: string;
    url: string;
    date: Date;
    kind: 'article' | 'talk';
    where: string;
    tags: string[];
    description?: string;
  };
};

export function buildFeed(posts: PostLike[], elsewhere: ElsewhereLike[]): FeedItem[] {
  const fromPosts: FeedItem[] = posts.map((p) => ({
    kind: 'post',
    title: p.data.title,
    url: postPath(p.id),
    date: p.data.pubDate,
    description: p.data.description,
    tags: p.data.tags,
    external: false,
    draft: p.data.draft ?? false,
  }));
  const fromElsewhere: FeedItem[] = elsewhere.map((e) => ({
    kind: e.data.kind,
    title: e.data.title,
    url: e.data.url,
    date: e.data.date,
    description: e.data.description,
    tags: e.data.tags,
    where: e.data.where,
    external: true,
    draft: false,
  }));
  return [...fromPosts, ...fromElsewhere].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Groups items by UTC year, newest year first. Expects items already sorted newest first (as buildFeed returns them) and keeps that order within a year. */
export function groupByYear(items: FeedItem[]): { year: number; items: FeedItem[] }[] {
  const years = new Map<number, FeedItem[]>();
  for (const item of items) {
    const year = item.date.getUTCFullYear();
    years.set(year, [...(years.get(year) ?? []), item]);
  }
  return [...years.entries()].sort((a, b) => b[0] - a[0]).map(([year, list]) => ({ year, items: list }));
}

export function collectTags(items: FeedItem[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export const withTag = (items: FeedItem[], tag: string): FeedItem[] => items.filter((i) => i.tags.includes(tag));
