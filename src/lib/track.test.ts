import { afterEach, describe, expect, it, vi } from 'vitest';
import { track } from './track';

const g = globalThis as { window?: unknown };

afterEach(() => {
  delete g.window;
});

describe('track', () => {
  it('prefixes event names with blog_ so they stand apart from zohdi.me events', () => {
    const umami = { track: vi.fn() };
    g.window = { umami };
    track('copy_code', { lang: 'js' });
    expect(umami.track).toHaveBeenCalledWith('blog_copy_code', { lang: 'js' });
  });

  it('does nothing when Umami is missing or throws', () => {
    g.window = {};
    expect(() => track('theme_toggle')).not.toThrow();
    g.window = { umami: { track: () => { throw new Error('blocked'); } } };
    expect(() => track('theme_toggle')).not.toThrow();
  });
});
