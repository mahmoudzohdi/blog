declare global {
  interface Window {
    umami?: { track: (name: string, data?: Record<string, string | number>) => void };
  }
}

/** Sends an Umami event. Does nothing when Umami is blocked or not configured. */
export function track(name: string, data?: Record<string, string | number>): void {
  try {
    window.umami?.track(name, data);
  } catch {
    // blocked by an extension or not loaded yet
  }
}
