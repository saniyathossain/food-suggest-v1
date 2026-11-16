// Theme and language switches, animated with the View Transitions API (Shell Console's theme reveal, Pathya's own lines):
//   theme    — the new look grows as a circle from the control that was pressed (~450 ms, ease-out);
//   language — the new dictionary and the new language's data for everything on screen load first (the old text stays up,
//              ~1.5 s at most), then one soft crossfade (blur + 4 px rise, 300 ms) lands straight on the translated page.
// Without view transitions, or under reduced motion, colours ease over 250 ms instead (html.theme-fade, styles/motion.css).
import { flushSync } from 'react-dom';
import { prepareLanguage } from '@/lib/api';
import { loadLanguage } from '@/lib/i18n';
import { readPrefs, setPrefs } from '@/lib/prefs';
import type { Lang, ThemeMode } from '@/lib/types';
import { reducedMotion } from '@/lib/utils';

type Transitioning = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };

function withTransition(kind: 'theme' | 'lang', update: () => void): void {
  const root = document.documentElement;
  const start = (document as Transitioning).startViewTransition;
  if (!start || reducedMotion()) {
    root.classList.add('theme-fade');
    update();
    window.setTimeout(() => root.classList.remove('theme-fade'), 300);
    return;
  }
  root.dataset.vt = kind;
  const transition = start.call(document, () => flushSync(update));
  void transition.finished.finally(() => delete root.dataset.vt);
}

/** The centre of the control that was pressed, where the new theme grows from (the middle of the screen without one). */
function origin(event?: { currentTarget: EventTarget | null }): { x: number; y: number } {
  const target = event?.currentTarget;
  if (!(target instanceof Element)) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const box = target.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

export function switchTheme(next: ThemeMode, event?: { currentTarget: EventTarget | null }): void {
  const { x, y } = origin(event);
  const root = document.documentElement;
  root.style.setProperty('--vt-x', `${x}px`);
  root.style.setProperty('--vt-y', `${y}px`);
  withTransition('theme', () => setPrefs({ theme: next }));
}

export function switchLang(next: Lang): void {
  const current = readPrefs().lang;
  if (current === next) return;
  void Promise.all([loadLanguage(next), prepareLanguage(current, next)]).then(() => withTransition('lang', () => setPrefs({ lang: next })));
}
