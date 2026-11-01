import { copyText, flash } from '../lib/copy';
import { track } from '../lib/track';

document.addEventListener('click', async (event) => {
  const target = event.target as Element;

  const button = target.closest<HTMLButtonElement>('button[data-copy-text]');
  if (button) {
    const text = button.dataset.copyText ?? '';
    if (await copyText(text)) flash(button, button.dataset.done ?? 'Copied');
    else window.prompt('Copy this:', text);
    if (button.dataset.event) track(button.dataset.event);
    return;
  }

  const link = target.closest<HTMLAnchorElement>('a[data-event]');
  if (link?.dataset.event) {
    track(link.dataset.event, link.dataset.eventLabel ? { label: link.dataset.eventLabel } : undefined);
  }
});
