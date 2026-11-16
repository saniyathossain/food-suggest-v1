// The plan's way of eating: the day as a timeline (the mode's own meals, or the everyday ones) with the gap between meals, which
// food to eat first, do / go easy / safety tips with their sources, and how each chosen condition fits the mode.
import { CategoryIcon, TriangleAlert } from '@/components/icons';
import { Check, ExternalLink } from '@/components/icons/page';
import { clock, digits, useI18n } from '@/lib/i18n';
import type { DietMode, ModeStance, Source } from '@/lib/types';
import { cn, tone } from '@/lib/utils';

type Moment = { slug: string; name: string; time: string | null; moment: string; note: string };

const minutesOf = (time: string) => {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
};

const STANCE_TONE: Record<ModeStance, string> = { suits: 'var(--leaf)', caution: 'var(--saffron)', doctor_first: 'var(--coral)' };

function SourceLink({ source }: { source: Source | null }) {
  if (!source) return null;
  if (!source.url) return <span className="text-caption text-muted-foreground">{source.publisher}</span>;
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-caption font-semibold text-primary">
      {source.publisher} <ExternalLink size={11} />
    </a>
  );
}

function Gap({ minutes }: { minutes: number }) {
  const { t, lang } = useI18n();
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const text = `${hours > 0 ? `${hours}${t.common.h} ` : ''}${rest > 0 ? `${rest}${t.common.min}` : ''}`.trim();
  return (
    <li aria-hidden className="ml-[13px] border-l-2 border-dashed border-border py-1.5 pl-6 text-caption font-semibold text-muted-foreground">
      {digits(text, lang)} {t.modes.gap}
    </li>
  );
}

function Timeline({ moments }: { moments: Moment[] }) {
  const { lang } = useI18n();
  return (
    <ol className="grid">
      {moments.map((moment, index) => {
        const next = moments[index + 1];
        const gap = moment.time && next?.time ? minutesOf(next.time) - minutesOf(moment.time) : null;
        return (
          <li key={moment.slug} className="contents">
            <div className="grid grid-cols-[28px_1fr] gap-3">
              <span className="mt-0.5 grid size-7 place-items-center rounded-full bg-primary-soft text-primary">
                <CategoryIcon slug={moment.slug} size={15} />
              </span>
              <div className="grid gap-0.5 pb-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-callout font-semibold">
                  {moment.name}
                  <span className="text-footnote font-medium text-muted-foreground">{moment.time ? clock(moment.time, lang) : moment.moment}</span>
                </p>
                {moment.note && <p className="text-subhead text-muted-foreground">{moment.note}</p>}
              </div>
            </div>
            {gap !== null && gap > 0 && <Gap minutes={gap} />}
          </li>
        );
      })}
    </ol>
  );
}

/** Which to eat first: vegetables, protein, then rice or ruti — the order that raises blood sugar least. */
function EatingOrder({ text, source }: { text: string; source: Source | null }) {
  const { t, num } = useI18n();
  const icons = ['vegetables', 'proteins', 'grains'];
  return (
    <div className="grid gap-4 rounded-2xl border bg-card p-5">
      <h3 className="text-headline">{t.modes.order}</h3>
      <ol className="flex flex-wrap items-center gap-2">
        {t.modes.orderSteps.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span className="order-step flex items-center gap-2 rounded-full bg-muted py-1.5 pl-1.5 pr-3.5 text-subhead font-semibold" style={{ animationDelay: `${index * 120}ms` }}>
              <span className="grid size-7 place-items-center rounded-full bg-card text-primary shadow-sm">
                <CategoryIcon slug={icons[index] ?? 'grains'} size={15} />
              </span>
              <span className="numeral text-caption text-muted-foreground">{num(index + 1)}</span>
              {step}
            </span>
            {index < t.modes.orderSteps.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
          </li>
        ))}
      </ol>
      <p className="text-subhead text-muted-foreground">{text}</p>
      <SourceLink source={source} />
    </div>
  );
}

export function ModePanel({ mode, everyday }: { mode: DietMode; everyday: Moment[] }) {
  const { t } = useI18n();
  const moments: Moment[] = mode.slots.length > 0 ? mode.slots : everyday;
  const order = mode.tips.find((tip) => tip.kind === 'order');
  const lists = (['do', 'dont', 'safety'] as const).map((kind) => ({ kind, items: mode.tips.filter((tip) => tip.kind === kind) })).filter((group) => group.items.length > 0);
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="grid content-start gap-4 rounded-2xl border bg-card p-5">
          <div>
            <h3 className="text-headline">{mode.name}</h3>
            <p className="mt-1 text-subhead text-muted-foreground">{mode.summary}</p>
            {mode.window && (
              <p className="mt-2 w-fit rounded-full bg-muted px-2.5 py-1 text-caption font-semibold">
                {t.modes.window}: {mode.window}
              </p>
            )}
          </div>
          <Timeline moments={moments} />
        </div>
        <div className="grid content-start gap-6">
          {order && <EatingOrder text={order.text} source={order.source} />}
          <div className="grid gap-3 sm:grid-cols-2">
            {lists.map((group) => (
              <div key={group.kind} className={cn('grid content-start gap-2 rounded-2xl border p-4', group.kind === 'safety' ? 'border-coral/40 bg-[color-mix(in_srgb,var(--coral)_7%,var(--card))] sm:col-span-2' : 'bg-card')}>
                <h4 className="flex items-center gap-1.5 text-subhead font-semibold">
                  {group.kind === 'safety' ? <TriangleAlert size={16} className="text-coral" /> : <Check size={16} className={group.kind === 'do' ? 'text-leaf' : 'text-saffron'} />}
                  {t.modes.tips[group.kind]}
                </h4>
                <ul className="grid gap-2">
                  {group.items.map((tip) => (
                    <li key={tip.text} className="grid gap-0.5 text-subhead">
                      <span>{tip.text}</span>
                      <SourceLink source={tip.source} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      {mode.conditions.length > 0 && (
        <div className="grid gap-3">
          <h3 className="text-headline">{t.modes.fit}</h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {mode.conditions.map((entry) => (
              <li key={entry.condition.slug} className="grid gap-2 rounded-2xl border bg-card p-4" style={tone(entry.condition.color)}>
                <p className="flex flex-wrap items-center gap-2 text-subhead font-semibold">
                  <i className="dot" /> {entry.condition.name}
                  <span className="rounded-full px-2 py-0.5 text-caption font-semibold text-[color-mix(in_srgb,var(--stance)_62%,var(--foreground))] [background:color-mix(in_srgb,var(--stance)_16%,transparent)]" style={{ '--stance': STANCE_TONE[entry.stance] } as React.CSSProperties}>
                    {t.modes.stance[entry.stance]}
                  </span>
                </p>
                <p className="text-subhead text-muted-foreground">{entry.reason}</p>
                <SourceLink source={entry.source} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
