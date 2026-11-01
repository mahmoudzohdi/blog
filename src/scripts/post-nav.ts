import { track } from '../lib/track';

const article = document.querySelector<HTMLElement>('[data-article]');

if (article) {
  const heads = [...article.querySelectorAll<HTMLElement>('h2[id], h3[id]')];
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
  const progress = document.querySelector<HTMLElement>('[data-progress]');
  const head = document.querySelector<HTMLElement>('.post-head');
  const secbar = document.querySelector<HTMLElement>('[data-secbar]');
  const secButton = document.querySelector<HTMLButtonElement>('[data-secbar-btn]');
  const secList = document.getElementById('secbar-list');
  const secCurrent = document.querySelector<HTMLElement>('[data-secbar-cur]');
  const secProgress = document.querySelector<HTMLElement>('[data-secbar-bar]');
  const minutesLeft = document.querySelector<HTMLElement>('[data-minutes-left]');
  const minutes = Number(article.dataset.minutes) || 1;

  // "#" links on headings, added here so RSS and no-JS readers don't see them
  for (const h of heads) {
    h.dataset.label = h.textContent?.trim() ?? '';
    const anchor = document.createElement('a');
    anchor.className = 'anchor';
    anchor.href = `#${h.id}`;
    anchor.textContent = '#';
    anchor.setAttribute('aria-label', `Link to section: ${h.dataset.label}`);
    h.prepend(anchor);
  }

  const setList = (open: boolean) => {
    secButton?.setAttribute('aria-expanded', String(open));
    if (secList) secList.hidden = !open;
  };

  const update = () => {
    const box = article.getBoundingClientRect();
    const read = Math.min(1, Math.max(0, (innerHeight * 0.3 - box.top) / box.height));
    if (progress) progress.style.width = `${read * 100}%`;
    if (secProgress) secProgress.style.width = `${read * 100}%`;

    let active = heads[0];
    for (const h of heads) if (h.getBoundingClientRect().top < innerHeight * 0.3) active = h;
    for (const link of links) link.setAttribute('aria-current', String(Boolean(active) && link.hash === `#${active.id}`));
    if (secCurrent && active) secCurrent.textContent = active.dataset.label ?? '';

    const pastHead = head ? head.getBoundingClientRect().bottom < 0 : false;
    if (secbar) {
      secbar.classList.toggle('show', pastHead);
      secbar.inert = !pastHead;
    }
    if (!pastHead) setList(false);

    if (minutesLeft) {
      minutesLeft.textContent = read >= 0.98 ? 'Finished' : `${Math.max(1, Math.ceil(minutes * (1 - read)))} min left`;
    }
  };

  let queued = false;
  addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        update();
        queued = false;
      });
    },
    { passive: true },
  );
  addEventListener('resize', update);
  update();

  secButton?.addEventListener('click', () => setList(Boolean(secList?.hidden)));
  for (const link of links) {
    link.addEventListener('click', () => {
      setList(false);
      track('toc_click');
    });
  }
  document.querySelector('[data-to-top]')?.addEventListener('click', () => scrollTo({ top: 0 }));
}
