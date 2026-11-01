import { copyText, flash } from '../lib/copy';
import { track } from '../lib/track';

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

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
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      flash(button, isMac ? 'Press ⌘C' : 'Press Ctrl+C', 3000);
    }
    track('copy_code', { lang: figure.dataset.lang ?? '' });
  });
}
