// Explore by condition: a feature card for the first condition (big photo beside its words) and a shelf for the rest, each with its
// verdict split and counts that count up once when they come into view.
import { Icon, LayoutGrid } from '@/components/icons';
import { ChevronRight } from '@/components/icons/page';
import { Carousel } from '@/components/kit/carousel';
import { CountUp } from '@/components/kit/countup';
import { Photo } from '@/components/kit/photo';
import { SectionTitle } from '@/components/kit/section';
import { VERDICTS, VerdictMeter } from '@/components/Verdict';
import { endpoints, prefetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { Bootstrap, ConditionSummary } from '@/lib/types';
import { cn, tone } from '@/lib/utils';

function Counts({ condition }: { condition: ConditionSummary }) {
  const { t } = useI18n();
  return (
    <dl className="mt-3 grid grid-cols-4 gap-2">
      {VERDICTS.map((verdict) => (
        <div key={verdict} className="grid">
          <dt className="order-2 text-caption text-muted-foreground">{t.verdict[verdict]}</dt>
          <dd className="numeral text-title-3 font-bold">
            <CountUp value={condition.counts[verdict]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ConditionCard({ condition, feature = false }: { condition: ConditionSummary; feature?: boolean }) {
  const { lang } = useI18n();
  const warm = () => prefetch(endpoints.condition(condition.slug, lang));
  return (
    <a
      href={`/condition/${condition.slug}`}
      onClick={onLink}
      onMouseEnter={warm}
      onFocus={warm}
      style={tone(condition.color)}
      className={cn('surface group grid overflow-hidden rounded-2xl', feature ? 'md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]' : 'w-[min(80vw,300px)]')}
    >
      <Photo src={condition.image} tone={condition.color} ratio={feature ? '16 / 10' : '4 / 3'} sizes={feature ? '(max-width: 768px) 100vw, 60vw' : '(max-width: 640px) 80vw, 300px'} zoom className={feature ? 'md:aspect-auto! md:h-full' : ''} />
      <div className={cn('relative grid content-start gap-2', feature ? 'p-6 sm:p-8' : 'p-5')}>
        <span className={cn('tile rounded-lg', feature ? 'size-14' : 'absolute -top-7 left-5 size-12 ring-4 ring-card')}>
          <Icon name={condition.icon} size={feature ? 28 : 24} />
        </span>
        <h3 className={cn('flex items-center justify-between gap-2', feature ? 'mt-2 text-title-1' : 'mt-5 text-title-3')}>
          {condition.name}
          <ChevronRight size={20} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
        </h3>
        <p className={cn('text-subhead text-muted-foreground', !feature && 'line-clamp-2')}>{condition.summary}</p>
        <VerdictMeter counts={condition.counts} className="mt-2" />
        <Counts condition={condition} />
      </div>
    </a>
  );
}

export function Conditions({ boot }: { boot: Bootstrap }) {
  const { t } = useI18n();
  const [first, ...rest] = boot.conditions;
  if (!first) return null;
  return (
    <section aria-labelledby="conditions-title">
      <SectionTitle icon={LayoutGrid} id="conditions-title" title={t.home.conditionsTitle} lead={t.home.conditionsLead} accent="leaf" />
      <ConditionCard condition={first} feature />
      <Carousel label={t.home.conditionsTitle} previous={t.common.previous} next={t.common.next} className="mt-6">
        {rest.map((condition) => (
          <ConditionCard key={condition.slug} condition={condition} />
        ))}
      </Carousel>
    </section>
  );
}
