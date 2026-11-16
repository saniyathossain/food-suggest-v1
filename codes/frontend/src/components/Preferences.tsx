// Language and theme, the two choices every page offers (top bar on a wide screen, the menu sheet on a phone). Both switch with a
// view transition (lib/switching): the theme grows from the pressed control, the language crossfades.
import { Monitor, Moon, Sun } from '@/components/icons';
import { useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import type { Lang, ThemeMode } from '@/lib/types';
import { cn } from '@/lib/utils';

/** The switch code (view transitions, flushSync) is its own small chunk, fetched on first use or when the browser is idle. */
const switching = () => import('@/lib/switching');

const THEMES: { value: ThemeMode; Glyph: typeof Sun }[] = [
  { value: 'light', Glyph: Sun },
  { value: 'auto', Glyph: Monitor },
  { value: 'dark', Glyph: Moon },
];

const LANGS: { value: Lang; label: string; name: string }[] = [
  { value: 'en', label: 'EN', name: 'English' },
  { value: 'bn', label: 'বাং', name: 'বাংলা' },
];

/** The top bar's compact pair: one button switches the language, one cycles the theme (light → dark → auto). */
export function PreferenceButtons({ className }: { className?: string | undefined }) {
  const { t, lang } = useI18n();
  const { theme } = usePrefs();
  const other = LANGS.find((option) => option.value !== lang) ?? LANGS[0]!;
  const order: ThemeMode[] = ['light', 'dark', 'auto'];
  const next = order[(order.indexOf(theme) + 1) % order.length] ?? 'light';
  const Current = THEMES.find((option) => option.value === theme)?.Glyph ?? Sun;
  const button = 'press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-card text-footnote font-bold text-foreground transition-colors hover:bg-muted';
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button type="button" lang={other.value} className={button} title={other.name} aria-label={`${t.prefs.language}: ${other.name}`} onClick={() => void switching().then((module) => module.switchLang(other.value))}>
        {other.label}
      </button>
      <button type="button" className={button} title={`${t.prefs.theme}: ${t.theme[theme]}`} aria-label={`${t.prefs.theme}: ${t.theme[theme]} → ${t.theme[next]}`} onClick={(event) => {
        const origin = { currentTarget: event.currentTarget };
        void switching().then((module) => module.switchTheme(next, origin));
      }}>
        <Current size={18} />
      </button>
    </div>
  );
}

export function Preferences({ className }: { className?: string | undefined }) {
  const { t, lang } = useI18n();
  const { theme } = usePrefs();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="seg seg-sm" role="group" aria-label={t.prefs.language}>
        {LANGS.map((option) => (
          <button key={option.value} type="button" lang={option.value} aria-pressed={option.value === lang} title={option.name} onClick={() => option.value !== lang && void switching().then((module) => module.switchLang(option.value))}>
            {option.label}
          </button>
        ))}
      </div>
      <div className="seg seg-sm" role="group" aria-label={t.prefs.theme}>
        {THEMES.map(({ value, Glyph }) => (
          <button key={value} type="button" aria-pressed={value === theme} aria-label={t.theme[value]} title={t.theme[value]} onClick={(event) => {
            if (value === theme) return;
            const origin = { currentTarget: event.currentTarget };
            void switching().then((module) => module.switchTheme(value, origin));
          }}>
            <Glyph size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}
