import { copyText, flash } from '../lib/copy';
import { track } from '../lib/track';

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Clipboard refused: select the same text in an off-screen textarea so the reader can copy it by hand. */
function selectForManualCopy(text: string, returnFocusTo: HTMLElement): void {
  const area = document.createElement('textarea');
  area.value = text;
  area.readOnly = true;
  area.setAttribute('aria-label', 'Code to copy');
  area.style.cssText = 'position: fixed; top: 0; left: -9999px;';
  document.body.append(area);
  area.focus({ preventScroll: true });
  area.select();

  const remove = () => {
    window.clearTimeout(timer);
    area.removeEventListener('blur', remove);
    if (document.activeElement === area) returnFocusTo.focus({ preventScroll: true });
    area.remove();
  };
  const timer = window.setTimeout(remove, 10_000);
  area.addEventListener('blur', remove);
}

for (const button of document.querySelectorAll<HTMLButtonElement>('.code-copy')) {
  button.addEventListener('click', async () => {
    const figure = button.closest<HTMLElement>('.code-block');
    const code = figure?.querySelector('code');
    if (!figure || !code) return;
    // Copy what the code becomes: skip lines a diff removes
    const lines = [...code.querySelectorAll<HTMLElement>('.line')].filter((l) => !l.classList.contains('remove'));
    const text = lines.map((l) => l.textContent ?? '').join('\n');
    if (await copyText(text)) {
      flash(button, 'Copied');
    } else {
      selectForManualCopy(text, button);
      flash(button, isMac ? 'Press ⌘C' : 'Press Ctrl+C', 3000);
    }
    track('copy_code', { lang: figure.dataset.lang ?? '' });
  });
}
