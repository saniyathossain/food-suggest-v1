// "Next check in 7": a ring that drains over the time it is given, with the time left ticking in its middle (Shell Console's
// CountdownRing). The ring is one CSS animation set from the moment it was made for, so it is smooth and cheap.
import { useState } from 'react';
import { Rolling } from '@/components/kit/rolling';
import { secondsLeft, shareLeft, useNow } from '@/lib/countdown';
import { cn } from '@/lib/utils';

const RADIUS = 22;
const LENGTH = 2 * Math.PI * RADIUS;

type Props = Readonly<{
  until: number;
  total: number;
  label?: string | undefined;
  format?: ((seconds: number) => string) | undefined;
  className?: string | undefined;
}>;

export function CountdownRing({ until, total, label, format = String, className }: Props) {
  const now = useNow();
  const text = format(secondsLeft(until, now));
  return (
    <div role="timer" aria-label={label ? `${label} ${text}` : text} className={cn('inline-grid justify-items-center gap-1.5', className)}>
      <span className="relative grid size-14 shrink-0 place-items-center">
        <svg viewBox="0 0 52 52" aria-hidden className="absolute inset-0 -rotate-90">
          <circle cx="26" cy="26" r={RADIUS} fill="none" strokeWidth={3} className="stroke-muted" />
          <Drain key={until} until={until} total={total} />
        </svg>
        <Rolling text={text} className="text-subhead font-semibold" />
      </span>
      {label && <span className="text-caption text-muted-foreground">{label}</span>}
    </div>
  );
}

/** The draining arc of one wait: where it starts is worked out once, then the browser runs the animation on its own. */
function Drain({ until, total }: Readonly<{ until: number; total: number }>) {
  const [delay] = useState(() => -(1 - shareLeft(until, total, Date.now())) * total);
  return (
    <circle
      cx="26"
      cy="26"
      r={RADIUS}
      fill="none"
      strokeWidth={3}
      strokeLinecap="round"
      strokeDasharray={LENGTH}
      className="ring-drain stroke-primary"
      style={{ ['--ring-len' as string]: LENGTH, animationDuration: `${total}ms`, animationDelay: `${delay}ms` }}
    />
  );
}
