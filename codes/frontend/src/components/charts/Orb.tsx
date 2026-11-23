// A living orb: a soft gradient bubble that slowly turns (the "breathing" orb of the video player). Two blurred colour layers rotate
// at different speeds inside a round, clipped glass; transform only, so it runs on the compositor and is paused off-screen, when the
// device is strained or when motion is reduced (styles/lens.css). Decorative: hidden from assistive tech.
import { cn } from '@/lib/utils';

export function Orb({ className }: { className?: string | undefined }) {
  return (
    <span aria-hidden className={cn('orb relative inline-block size-10 shrink-0 overflow-hidden rounded-full', className)}>
      <span className="orb-layer orb-a" />
      <span className="orb-layer orb-b" />
    </span>
  );
}
