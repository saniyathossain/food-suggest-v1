// A filter chip: pressed state, an optional icon before the label and a count after it (food and recipe filters).
import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';

export function FilterChip({ on, onClick, label, count, children }: { on: boolean; onClick: () => void; label: string; count?: number | undefined; children?: ReactNode }) {
  const { num } = useI18n();
  return (
    <button type="button" className="chip press shrink-0 cursor-pointer pl-3.5" aria-pressed={on} onClick={onClick}>
      {children} {label}
      {count !== undefined && <span className="min-w-6 rounded-full bg-muted px-1.5 text-center text-caption font-bold tabular-nums text-muted-foreground">{num(count)}</span>}
    </button>
  );
}
