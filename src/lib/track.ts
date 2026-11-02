declare global {
  interface Window {
    umami?: { track: (name: string, data?: Record<string, string | number>) => void };
  }
}

/** The blog shares zohdi.me's Umami website, so its events carry this prefix (e.g. blog_copy_code). */
const EVENT_PREFIX = 'blog_';

/** Sends an Umami event. Does nothing when Umami is blocked or not configured. */
export function track(name: string, data?: Record<string, string | number>): void {
  try {
    window.umami?.track(`${EVENT_PREFIX}${name}`, data);
  } catch {
    // blocked by an extension or not loaded yet
  }
}
