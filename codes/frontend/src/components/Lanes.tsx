// Verdict lanes: one colour-coded column per verdict (avoid · go easy · fine · eat more). Side by side on a wide screen; on a phone
// they become a row of cards that swipe sideways and snap. Every food links to its page.
import type { ReactNode } from 'react';
import { VerdictIcon } from '@/components/icons';
import { verdictColor } from '@/components/Verdict';
import { useI18n } from '@/lib/i18n';
import type { Verdict } from '@/lib/types';
import { cn, tone } from '@/lib/utils';

export function Lane({ verdict, count, children }: { verdict: Verdict; count: number; children: ReactNode }) {
  const { t, num } = useI18n();
  return (
    <section aria-label={t.verdict[verdict]} className="surface flex w-[min(84vw,360px)] flex-col overflow-hidden rounded-xl md:w-auto" style={tone(verdictColor[verdict])}>
      <header className="tone-soft mb-2 flex items-center gap-3 p-4">
        <span className="tile grid size-10 place-items-center rounded-md">
          <VerdictIcon verdict={verdict} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-headline">{t.verdict[verdict]}</h3>
          <p className="text-footnote text-muted-foreground">{t.verdictLead[verdict]}</p>
        </div>
        <span className="numeral text-title-2 font-bold">{num(count)}</span>
      </header>
      <ul className="grid gap-0.5 px-4 pb-4">{children}</ul>
    </section>
  );
}

export function Lanes({ children, columns = 4 }: { children: ReactNode; columns?: 3 | 4 }) {
  return (
    <div className={cn('rail -mx-[clamp(14px,2.4vw,32px)] snap-x snap-mandatory scroll-px-[clamp(14px,2.4vw,32px)] items-start gap-4 px-[clamp(14px,2.4vw,32px)] pb-2 md:mx-0 md:grid md:overflow-visible md:px-0 md:pb-0 [&>*]:shrink-0 [&>*]:snap-start', columns === 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3')}>
      {children}
    </div>
  );
}
