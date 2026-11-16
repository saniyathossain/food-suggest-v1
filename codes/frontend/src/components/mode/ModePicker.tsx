// Choose how you eat: everyday, Ramadan fasting, 16:8 — the modes admin has switched on (bootstrap). A radio group of cards; the
// choice is saved with the profile, and the plan refetches for it.
import type { ReactNode } from 'react';
import { Moon, Sun } from '@/components/icons';
import { Clock } from '@/components/icons/page';
import { useI18n } from '@/lib/i18n';
import type { DietModeBrief, DietModeKind } from '@/lib/types';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<DietModeKind, ReactNode> = { general: <Sun size={20} />, religious_fast: <Moon size={20} />, time_restricted: <Clock size={20} /> };
const KIND_TONE: Record<DietModeKind, string> = { general: 'var(--leaf)', religious_fast: 'var(--aubergine)', time_restricted: 'var(--river)' };

export function ModePicker({ modes, value, onChange }: { modes: DietModeBrief[]; value: string; onChange: (slug: string) => void }) {
  const { t } = useI18n();
  if (modes.length < 2) return null;
  return (
    <div role="radiogroup" aria-label={t.modes.title} className="grid gap-2.5 sm:grid-cols-3">
      {modes.map((mode) => {
        const active = mode.slug === value;
        return (
          <button
            key={mode.slug}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode.slug)}
            style={{ '--tone': KIND_TONE[mode.kind] } as React.CSSProperties}
            className={cn(
              'press grid content-start gap-2 rounded-[24px] border-2 p-4 text-left transition-[border-color,background-color,box-shadow] duration-200',
              active ? 'border-foreground bg-card shadow-[0_10px_24px_-14px_var(--shade-deep)]' : 'border-transparent bg-card hover:border-[color-mix(in_srgb,var(--foreground)_20%,transparent)]',
            )}
          >
            <span className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-full text-[var(--tone)] [background:color-mix(in_srgb,var(--tone)_14%,transparent)]">{KIND_ICON[mode.kind]}</span>
              <strong className="text-callout">{mode.name}</strong>
            </span>
            <span className="text-footnote text-muted-foreground">{mode.summary}</span>
            {mode.window && (
              <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-caption font-semibold">
                {t.modes.window}: {mode.window}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
