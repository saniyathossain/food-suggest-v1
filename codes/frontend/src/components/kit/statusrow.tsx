// One thing that is being waited for, as a row (Shell Console's StatusRow): its name, its state, and a tile that changes with the
// state (a spinner while checked, a check once it answers, a pulsing alert while it does not). The change pops in (CSS, keyed), so
// the outage screen needs no motion library on the first paint.
import { Loader, type AppIcon } from '@/components/icons';
import { Check, CircleAlert } from '@/components/icons/page';
import { cn } from '@/lib/utils';

export type CheckState = 'ok' | 'bad' | 'checking';

const LOOK: Record<CheckState, { icon: AppIcon; tile: string; text: string }> = {
  ok: { icon: Check, tile: 'bg-success-soft text-recommended-ink', text: 'text-recommended-ink' },
  bad: { icon: CircleAlert, tile: 'halo bg-danger-soft text-avoid-ink', text: 'text-avoid-ink' },
  checking: { icon: Loader, tile: 'bg-muted text-muted-foreground', text: 'text-muted-foreground' },
};

type Props = Readonly<{ label: string; state: CheckState; note: string; icon?: AppIcon | undefined; className?: string | undefined }>;

export function StatusRow({ label, state, note, icon: Kind, className }: Props) {
  const look = LOOK[state];
  const Glyph = look.icon;
  return (
    <li className={cn('flex items-center gap-3 px-4 py-3 text-subhead', className)}>
      <span aria-hidden className={cn('grid size-8 shrink-0 place-items-center rounded-md transition-colors duration-300', look.tile)}>
        <span key={state} className="swap-in grid place-items-center">
          <Glyph size={16} className={cn(state === 'checking' && 'animate-spin')} />
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2 font-semibold">
        {Kind && <Kind size={15} className="shrink-0 text-muted-foreground" />}
        <span className="truncate">{label}</span>
      </span>
      <span key={note} className={cn('data-in ms-auto text-right text-footnote', look.text)}>
        {note}
      </span>
    </li>
  );
}
