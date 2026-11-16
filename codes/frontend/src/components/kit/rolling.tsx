// A figure that ticks like an odometer (Shell Console's shared/rolling): every digit is a column of its own and only the digits that
// change move. Whatever is not a digit stands still. A screen reader reads the figure once, plain. Reduced motion shows it at once.
import { memo, useEffect, useState } from 'react';
import { rollColumns, type RollDir } from '@/lib/rolling';
import { cn, reducedMotion } from '@/lib/utils';

type Slot = { char: string; from: string | null; motion: RollDir | null; turn: number };

const Digit = memo(function Digit({ char, dir }: Readonly<{ char: string; dir: RollDir }>) {
  const [slot, setSlot] = useState<Slot>({ char, from: null, motion: null, turn: 0 });
  if (slot.char !== char) {
    const still = reducedMotion();
    setSlot({ char, from: still ? null : slot.char, motion: still ? null : dir, turn: slot.turn + 1 });
  }
  const leaving = slot.from !== null;
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setSlot((now) => (now.turn === slot.turn ? { ...now, from: null } : now)), 1200);
    return () => window.clearTimeout(timer);
  }, [leaving, slot.turn]);
  return (
    <span className="odo" data-live={leaving || undefined}>
      <span key={slot.turn} className="odo-in" data-motion={slot.motion ?? undefined}>
        {slot.char}
      </span>
      {leaving && (
        <span key={`out${slot.turn}`} aria-hidden className="odo-out" data-motion={slot.motion ?? undefined}>
          {slot.from}
        </span>
      )}
    </span>
  );
});

export function Rolling({ text, forward, className }: Readonly<{ text: string; forward?: boolean | undefined; className?: string | undefined }>) {
  const [seen, setSeen] = useState<{ text: string; previous: string | null }>({ text, previous: null });
  if (seen.text !== text) setSeen({ text, previous: seen.text });
  return (
    <span className={cn('tabular-nums', className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {rollColumns(text, seen.previous, forward).map((column) =>
          column.kind === 'text' ? <span key={column.key}>{column.text}</span> : <Digit key={column.key} char={column.char} dir={column.dir} />,
        )}
      </span>
    </span>
  );
}
