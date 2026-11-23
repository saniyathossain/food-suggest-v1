// Small page-level switches for the glass layer (styles/glass.css): <html data-hidden> while the tab is in the background, so every
// CSS animation pauses and a hidden tab costs nothing; and <html data-nav> starts at "peer" so the first transition has a direction.
export function installChrome(): void {
  const root = document.documentElement;
  const sync = () => {
    if (document.hidden) root.dataset.hidden = '';
    else delete root.dataset.hidden;
  };
  sync();
  document.addEventListener('visibilitychange', sync);
  root.dataset.nav = 'peer';
  followPointer();
}

/** The card under a fine pointer gets --px and --py (where the pointer is inside it), once per frame, so its glass light can follow. */
function followPointer(): void {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let frame = 0;
  let last: PointerEvent | null = null;
  const paint = () => {
    frame = 0;
    const event = last;
    if (!event || !(event.target instanceof Element)) return;
    const card = event.target.closest<HTMLElement>('.surface');
    if (card) {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--px', `${event.clientX - box.left}px`);
      card.style.setProperty('--py', `${event.clientY - box.top}px`);
      // where the pointer sits from the card's centre, -1 to 1: a link card tilts toward it a couple of degrees
      card.style.setProperty('--tx', String(((event.clientX - box.left) / box.width - 0.5) * 2));
      card.style.setProperty('--ty', String(((event.clientY - box.top) / box.height - 0.5) * 2));
    }
    const magnet = event.target.closest<HTMLElement>('.shine');
    if (magnet) {
      const box = magnet.getBoundingClientRect();
      magnet.style.setProperty('--mx', String(((event.clientX - box.left) / box.width - 0.5) * 2));
      magnet.style.setProperty('--my', String(((event.clientY - box.top) / box.height - 0.5) * 2));
    }
  };
  document.addEventListener(
    'pointermove',
    (event) => {
      last = event;
      if (frame === 0 && !document.hidden) frame = requestAnimationFrame(paint);
    },
    { passive: true },
  );
}
