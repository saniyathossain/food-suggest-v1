// A card's one line about trouble (Shell Console's StateStrip): a tile with an icon that says what kind, a short title, the reason in
// its own words. The reason fades in again when it changes, so a new one is noticed.
import type { ReactNode } from 'react';
import { TriangleAlert, type AppIcon } from '@/components/icons';
import { CircleAlert } from '@/components/icons/page';
import { Info } from '@/components/icons/page';
import { cn } from '@/lib/utils';

type Tone = 'bad' | 'warn' | 'info';

const LOOK: Record<Tone, { box: string; icon: AppIcon }> = {
  bad: { box: 'bg-danger-soft text-avoid-ink', icon: CircleAlert },
  warn: { box: 'bg-warning-soft text-limit-ink', icon: TriangleAlert },
  info: { box: 'bg-muted text-muted-foreground', icon: Info },
};

type Props = Readonly<{ tone: Tone; title?: string | undefined; message?: string | undefined; children?: ReactNode; className?: string | undefined }>;

export function StateStrip({ tone, title, message, children, className }: Props) {
  const look = LOOK[tone];
  const Glyph = look.icon;
  return (
    <div role={tone === 'info' ? 'status' : 'alert'} className={cn('flex min-w-0 items-start gap-3 rounded-lg px-4 py-3 text-subhead', look.box, className)}>
      <Glyph size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {message && (
          <p key={message} className="data-in text-foreground/80">
            {message}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
