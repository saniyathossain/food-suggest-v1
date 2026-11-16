// Smooth scrolling (Lenis, Shell Console's lib/smooth): the page glides where the wheel or the keys point instead of jumping. Loaded
// when the browser is idle (its own chunk, never on the first paint). Left to the browser where it would hurt: touch screens (their
// own inertia is already smooth), a reader who asked for reduced motion, and anything that scrolls on its own (Spotlight, a menu,
// a table, a text box).

/** What keeps its own scroll: the page never glides under a dialog, a menu, a list or a text box. */
const OWN_SCROLL = '[role="dialog"], [role="menu"], [role="listbox"], [data-lenis-prevent], textarea, .overflow-x-auto, .rail';

let started = false;

export function installSmoothScroll(): void {
  if (started) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (reduced || touch) return;
  started = true;
  void import('lenis').then(({ default: Lenis }) => {
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.14,
      smoothWheel: true,
      anchors: false,
      prevent: (node: HTMLElement) => node.closest(OWN_SCROLL) !== null,
    });
    window.addEventListener('pathya:navigate', () => lenis.scrollTo(0, { immediate: true }));
  });
}
