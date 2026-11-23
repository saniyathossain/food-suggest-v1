// A section heading (FlavorFit): a small outlined icon box, the title, an optional lead, and room on the right for an action
// ("See all", a filter). Accents are Pathya's food tones; one family per section.
import type { ReactNode } from 'react';
import type { AppIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export type Accent = 'leaf' | 'saffron' | 'mango' | 'coral' | 'aubergine' | 'river';

export const accentColor = (accent: Accent): string => `var(--${accent})`;

type Props = Readonly<{
  icon: AppIcon;
  title: string;
  lead?: string | undefined;
  accent?: Accent | undefined;
  /** h2 by default; a page's first heading passes 1 */
  level?: 1 | 2 | undefined;
  id?: string | undefined;
  children?: ReactNode;
  className?: string | undefined;
}>;

export function SectionTitle({ icon: Glyph, title, lead, level = 2, id, children, className }: Props) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div data-section-title className={cn('mb-7 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card text-foreground shadow-[var(--sh-xs)]" aria-hidden>
          <Glyph size={20} />
        </span>
        <div className="min-w-0">
          <Heading id={id} className={level === 1 ? 'text-large-title' : 'text-title-2 sm:text-title-1'}>
            {title}
          </Heading>
          {lead && <p className="mt-1 max-w-[62ch] text-subhead text-muted-foreground">{lead}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
