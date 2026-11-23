// Quiet preparation for a language switch: the Bangla face and the other language's dictionary, fetched after first paint (lib/switching
// then swaps at once). Its own small module so main.tsx can load it without pulling the switching code into the first bundle.
import { loadLanguage } from '@/lib/i18n';
import { readPrefs } from '@/lib/prefs';
import type { Lang } from '@/lib/types';

const FONT_WAIT_MS = 600;

/** The Bangla face, fetched on first use; having it before the swap keeps the text from jumping. Gives up after 600 ms. */
export function banglaFontReady(): Promise<void> {
  if (!('fonts' in document)) return Promise.resolve();
  const loaded = document.fonts.load('16px "Noto Sans Bengali Variable"', 'ক').then(() => undefined, () => undefined);
  return Promise.race([loaded, new Promise<void>((resolve) => window.setTimeout(resolve, FONT_WAIT_MS))]);
}

const saveData = (): boolean => (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;

type Idle = { requestIdleCallback?: (run: () => void, options?: { timeout: number }) => number };

/** After first paint, fetch what a switch to the other language needs. Skipped on data saver and on a strained device. */
export function warmOtherLanguage(): void {
  if (saveData() || 'strained' in document.documentElement.dataset) return;
  const other: Lang = readPrefs().lang === 'bn' ? 'en' : 'bn';
  const run = (): void => {
    void loadLanguage(other).catch(() => undefined);
    if (other === 'bn') void banglaFontReady();
  };
  const idle = (window as Idle).requestIdleCallback;
  if (idle) idle(run, { timeout: 4000 });
  else window.setTimeout(run, 2000);
}
