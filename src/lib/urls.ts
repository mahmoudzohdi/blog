/** Makes a root-relative URL absolute against `site`. Leaves absolute, protocol-relative, hash and relative URLs alone. */
export const absoluteUrl = (value: string, site: URL): string =>
  value.startsWith('/') && !value.startsWith('//') ? new URL(value, site).href : value;

/** Same for every candidate in a srcset ("url 720w, url 1440w"). */
export const absoluteSrcset = (srcset: string, site: URL): string =>
  srcset
    .split(',')
    .map((part) => {
      const [url, size] = part.trim().split(/\s+/);
      return [absoluteUrl(url, site), size].filter(Boolean).join(' ');
    })
    .join(', ');
