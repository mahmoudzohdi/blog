/** Copies text to the clipboard. Returns false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const timers = new WeakMap<HTMLElement, number>();

/** Shows a short confirmation on a button, then restores its label. */
export function flash(button: HTMLElement, label: string, ms = 1600): void {
  const target = button.querySelector<HTMLElement>('[data-label]') ?? button;
  const original = target.dataset.original ?? target.textContent ?? '';
  target.dataset.original = original;
  target.textContent = label;
  button.classList.add('done');

  const previous = timers.get(button);
  if (previous !== undefined) window.clearTimeout(previous);
  timers.set(
    button,
    window.setTimeout(() => {
      target.textContent = original;
      button.classList.remove('done');
      timers.delete(button);
    }, ms),
  );
}
