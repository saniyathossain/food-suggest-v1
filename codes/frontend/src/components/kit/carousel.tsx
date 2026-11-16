// A horizontal shelf: native scroll-snap (swipe on a phone, the trackpad on a laptop), drag with a mouse, and two round buttons that
// page it by a card. Cheap on CPU: the browser scrolls it; the drag only writes scrollLeft. Lenis leaves it alone (.rail).
import { useRef, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight } from '@/components/icons/page';
import { cn } from '@/lib/utils';

type Props = Readonly<{ label: string; children: ReactNode; className?: string | undefined; itemClass?: string | undefined; previous: string; next: string }>;

function useDrag() {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const down = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse' || !rail.current) return;
    drag.current = { x: event.clientX, left: rail.current.scrollLeft, moved: false };
  };
  const move = (event: React.PointerEvent) => {
    const held = drag.current;
    if (!held || !rail.current) return;
    const delta = event.clientX - held.x;
    if (Math.abs(delta) > 4) held.moved = true;
    rail.current.scrollLeft = held.left - delta;
  };
  const up = () => {
    window.setTimeout(() => (drag.current = null), 0);
  };
  /** a drag is not a click on the card under it */
  const click = (event: React.MouseEvent) => {
    if (drag.current?.moved) event.preventDefault();
  };
  return { rail, down, move, up, click };
}

export function Carousel({ label, children, className, previous, next }: Props) {
  const { rail, down, move, up, click } = useDrag();
  const page = (direction: 1 | -1) => {
    const node = rail.current;
    if (!node) return;
    const card = node.firstElementChild as HTMLElement | null;
    node.scrollBy({ left: direction * ((card?.offsetWidth ?? 300) + 16), behavior: 'smooth' });
  };
  return (
    <div className={cn('group/rail relative', className)} role="region" aria-label={label}>
      <div
        ref={rail}
        className="rail -mx-[clamp(14px,2.4vw,32px)] snap-x snap-mandatory scroll-px-[clamp(14px,2.4vw,32px)] gap-4 px-[clamp(14px,2.4vw,32px)] pb-3 pt-1 [&>*]:snap-start [&>*]:shrink-0"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        onClickCapture={click}
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-y-0 -left-2 -right-2 hidden items-center justify-between md:flex">
        <RailButton label={previous} onClick={() => page(-1)} icon={<ArrowLeft size={18} />} />
        <RailButton label={next} onClick={() => page(1)} icon={<ChevronRight size={18} />} />
      </div>
    </div>
  );
}

function RailButton({ label, onClick, icon }: Readonly<{ label: string; onClick: () => void; icon: ReactNode }>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="press pointer-events-auto grid size-10 cursor-pointer place-items-center rounded-full border bg-card text-foreground opacity-0 shadow-md transition-opacity group-hover/rail:opacity-100 focus-visible:opacity-100 hover:bg-muted"
    >
      {icon}
    </button>
  );
}
