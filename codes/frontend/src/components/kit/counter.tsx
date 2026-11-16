// A number typed or counted (Shell Console's Counter): a pill with a minus, the figure and a plus. Held, the buttons keep stepping
// (faster after a moment); the arrow keys step too (shift: by ten); only digits can be typed. The figure is shown in the reader's
// digits. The buttons stop at the bounds.
import { useEffect, useRef } from 'react';
import { Minus, Plus } from '@/components/icons/page';
import { IconButton } from '@/components/ui/icon-button';
import { t, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  value: number;
  onChange: (next: number) => void;
  label: string;
  min?: number | undefined;
  max?: number | undefined;
  id?: string | undefined;
  className?: string | undefined;
}>;

const HOLD_WAIT = 380;
const HOLD_EVERY = 70;

const BN_ZERO = '০'.charCodeAt(0);
/** Bangla or Latin digits typed → a number. */
const parse = (text: string) => Number(text.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - BN_ZERO)).replace(/\D/g, '') || '0');

export function Counter({ value, onChange, label, min = 0, max = 999, id, className }: Props) {
  const { num } = useI18n();
  const hold = useRef<{ wait?: number; every?: number }>({});
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next)));
  const latest = useRef((by: number) => onChange(clamp(value + by)));
  latest.current = (by: number) => onChange(clamp(value + by));
  const stop = () => {
    window.clearTimeout(hold.current.wait);
    window.clearInterval(hold.current.every);
  };
  useEffect(() => stop, []);
  const press = (by: number) => {
    latest.current(by);
    stop();
    hold.current.wait = window.setTimeout(() => {
      hold.current.every = window.setInterval(() => latest.current(by), HOLD_EVERY);
    }, HOLD_WAIT);
  };
  const keys: Record<string, (shift: boolean) => void> = {
    ArrowUp: (shift) => latest.current(shift ? 10 : 1),
    ArrowDown: (shift) => latest.current(shift ? -10 : -1),
  };
  return (
    <div className={cn('field inline-flex h-11 items-center gap-1 rounded-full px-1', className)}>
      <IconButton icon={Minus} label={t('kit.counter.less', label)} tone="soft" disabled={value <= min} onPointerDown={() => press(-1)} onPointerUp={stop} onPointerLeave={stop} onClick={(event) => event.detail === 0 && latest.current(-1)} />
      <input
        id={id}
        inputMode="numeric"
        placeholder="0"
        aria-label={label}
        value={num(value)}
        className="w-14 bg-transparent text-center text-callout font-semibold tabular-nums outline-none"
        onChange={(event) => onChange(clamp(parse(event.target.value)))}
        onKeyDown={(event) => {
          const act = keys[event.key];
          if (!act) return;
          event.preventDefault();
          act(event.shiftKey);
        }}
      />
      <IconButton icon={Plus} label={t('kit.counter.more', label)} tone="soft" disabled={value >= max} onPointerDown={() => press(1)} onPointerUp={stop} onPointerLeave={stop} onClick={(event) => event.detail === 0 && latest.current(1)} />
    </div>
  );
}
