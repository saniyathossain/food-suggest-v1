// A filter chip: pressed state, an optional icon before the label (a check takes its place when the chip is on) and a count after it.
// `color` tints the chosen state (a food group's own colour); without it the brand violet is used. Styles: styles/glass.css `.chip`.
import type { CSSProperties, ReactNode } from 'react';
import { Check } from '@/components/icons/page';
import { useI18n } from '@/lib/i18n';

type Props = { on: boolean; onClick: () => void; label: string; count?: number | undefined; color?: string | undefined; children?: ReactNode };

/** A chip whose count is zero and that is not on cannot narrow anything: it stays on screen, dimmed and inert, so the row does not jump. */

export function FilterChip({ on, onClick, label, count, color, children }: Props) {
  const { num } = useI18n();
  return (
    <button type="button" className="chip press shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45" aria-pressed={on} disabled={!on && count === 0} onClick={onClick} style={color ? ({ '--chip-fg': color } as CSSProperties) : undefined}>
      {on ? (
        <span aria-hidden className="chip-tick">
          <Check size={12} strokeWidth={3} />
        </span>
      ) : (
        children
      )}
      {label}
      {count !== undefined && <span className="chip-count">{num(count)}</span>}
    </button>
  );
}
