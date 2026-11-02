/** Root-relative refs (and refs to our own origin) found in href, src, srcset and content attributes. */
export function localRefs(html, origin) {
  const raw = [];
  for (const m of html.matchAll(/\s(?:href|src|content)="([^"]+)"/g)) raw.push(m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) for (const part of m[1].split(',')) raw.push(part.trim().split(/\s+/)[0]);
  const refs = new Set();
  for (let ref of raw) {
    if (ref.startsWith(origin)) ref = ref.slice(origin.length) || '/';
    if (!ref.startsWith('/') || ref.startsWith('//')) continue;
    const path = ref.split(/[?#]/)[0];
    if (path) refs.add(path);
  }
  return [...refs];
}

export function candidates(ref) {
  let path;
  try {
    path = decodeURIComponent(ref);
  } catch {
    return []; // malformed %-escape: no file can match, so it is reported as broken
  }
  if (path.endsWith('/')) return [`${path}index.html`];
  return [path, `${path}/index.html`, `${path}.html`];
}

/** pages: [{ file, html }]; exists(pathInDist) → boolean */
export function findBroken(pages, exists, origin) {
  const broken = [];
  for (const { file, html } of pages) {
    for (const ref of localRefs(html, origin)) {
      if (!candidates(ref).some(exists)) broken.push({ file, ref });
    }
  }
  return broken;
}
