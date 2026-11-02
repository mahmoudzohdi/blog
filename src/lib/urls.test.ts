import { describe, expect, it } from 'vitest';
import { absoluteSrcset, absoluteUrl } from './urls';

const site = new URL('https://blog.zohdi.me');

describe('absoluteUrl', () => {
  it('makes a root-relative URL absolute', () => {
    expect(absoluteUrl('/_astro/sample.webp', site)).toBe('https://blog.zohdi.me/_astro/sample.webp');
  });

  it('leaves an absolute URL unchanged', () => {
    expect(absoluteUrl('https://stackblitz.com/edit/vitejs-vite', site)).toBe('https://stackblitz.com/edit/vitejs-vite');
  });

  it('leaves a protocol-relative URL unchanged', () => {
    expect(absoluteUrl('//cdn.x/a.png', site)).toBe('//cdn.x/a.png');
  });

  it('leaves hash and relative URLs unchanged', () => {
    expect(absoluteUrl('#frag', site)).toBe('#frag');
    expect(absoluteUrl('relative/path', site)).toBe('relative/path');
  });
});

describe('absoluteSrcset', () => {
  it('makes every candidate absolute and keeps the widths', () => {
    expect(absoluteSrcset('/_astro/a.webp 720w, /_astro/b.webp 1440w', site)).toBe(
      'https://blog.zohdi.me/_astro/a.webp 720w, https://blog.zohdi.me/_astro/b.webp 1440w',
    );
  });

  it('handles a single candidate without a descriptor', () => {
    expect(absoluteSrcset('/_astro/a.webp', site)).toBe('https://blog.zohdi.me/_astro/a.webp');
  });
});
