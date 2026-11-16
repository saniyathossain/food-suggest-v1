// Ways to have a food (variants that carry a cooking method): choice cards grouped raw / cooked / other kinds — its picture
// when the gallery has one, name, calories per 100 g and how much
// fat the cooking adds, the lightest way flagged — and, for the chosen way, the difference against the plain version and the
// conditions that are stricter about it, each with its reason and source. Numbers come from the dataset; nothing is typed here.
import type { ReactNode } from 'react';
import { ExternalLink, Fire, Droplet, Leaf, Star } from '@/components/icons/page';
import { CountUp } from '@/components/kit/countup';
import { Cutout } from '@/components/kit/cutout';
import { Photo } from '@/components/kit/photo';
import { VerdictBadge } from '@/components/Verdict';
import { useI18n } from '@/lib/i18n';
import type { CookingFat, FoodVariant } from '@/lib/types';
import { cn, tone } from '@/lib/utils';

const FAT_TONE: Record<CookingFat, string> = { none: 'var(--leaf)', little: 'var(--river)', added: 'var(--saffron)', deep: 'var(--coral)' };
const FAT_ICON: Record<CookingFat, ReactNode> = { none: <Leaf size={14} />, little: <Droplet size={14} />, added: <Droplet size={14} />, deep: <Fire size={14} /> };

export function FatPill({ fat }: { fat: CookingFat }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--tone)_14%,transparent)] px-2 py-0.5 text-caption font-semibold text-[color-mix(in_srgb,var(--tone)_62%,var(--foreground))]" style={{ '--tone': FAT_TONE[fat] } as React.CSSProperties}>
      {FAT_ICON[fat]} {t.food.fatLevel[fat]}
    </span>
  );
}

type PickerProps = { variants: FoodVariant[]; chosen: string; best: string | null; onChoose: (slug: string) => void };

// raw / cooked / other kinds (cuts, forms) — the group a variant sits in, from its cooking method
type Group = 'raw' | 'cooked' | 'types';
const groupOf = (variant: FoodVariant): Group => (variant.method === null ? 'types' : variant.method === 'raw' ? 'raw' : 'cooked');
const GROUPS: Group[] = ['raw', 'cooked', 'types'];

function Choice({ variant, active, best, slot, onChoose }: { variant: FoodVariant; active: boolean; best: boolean; slot: boolean; onChoose: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onChoose}
      className={cn(
        'press relative grid content-start gap-2 rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-200',
        active ? 'border-foreground bg-card shadow-[0_10px_24px_-14px_var(--shade-deep)]' : 'bg-card hover:border-primary/30 hover:bg-accent',
      )}
    >
      {best && (
        <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-caption font-semibold text-primary-foreground shadow-sm">
          <Star size={12} /> {t.food.lightest}
        </span>
      )}
      {/* every card in a group keeps the picture's slot when any of them has a picture, so the row stays one height */}
      {slot && !variant.photo && <span aria-hidden className="block h-16 rounded-lg bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]" />}
      {variant.photo && (
        <span className="block h-16 overflow-hidden rounded-lg">
          {variant.photo.transparent ? (
            <Cutout src={variant.photo.url} alt="" ratio="auto" sizes="140px" shadow={false} className="size-full" />
          ) : (
            <Photo src={variant.photo.url} alt="" ratio="auto" sizes="140px" className="size-full" />
          )}
        </span>
      )}
      <span className="text-subhead font-semibold leading-snug">{variant.name}</span>
      <span className="flex items-baseline gap-1">
        {variant.per_100g.kcal === null ? <span className="numeral text-title-3">—</span> : <CountUp value={Math.round(variant.per_100g.kcal)} className="numeral text-title-3" />}
        <span className="text-caption text-muted-foreground">{t.food.kcal}</span>
      </span>
      {variant.fat && <FatPill fat={variant.fat} />}
    </button>
  );
}

/** Choice cards, one per way of having the food, grouped raw / cooked / other kinds when it has more than one group. */
export function CookingPicker({ variants, chosen, best, onChoose }: PickerProps) {
  const { t } = useI18n();
  const groups = GROUPS.map((group) => ({ group, items: variants.filter((variant) => groupOf(variant) === group) })).filter((entry) => entry.items.length > 0);
  return (
    <div role="radiogroup" aria-label={t.food.waysToCook} className="grid gap-4">
      {groups.map(({ group, items }) => (
        <div key={group} className="grid gap-2">
          {groups.length > 1 && <p className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">{t.food.variantGroup[group]}</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(140px,100%),1fr))] gap-2.5">
            {items.map((variant) => (
              <Choice key={variant.slug} variant={variant} active={variant.slug === chosen} best={variant.slug === best} slot={items.some((item) => item.photo)} onChoose={() => onChoose(variant.slug)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function signed(value: number, format: (value: number) => string) {
  if (Math.abs(value) < 0.05) return '±0';
  return `${value > 0 ? '+' : '−'}${format(Math.abs(value))}`;
}

/** Under the numbers: how this way compares with the plain one, and which conditions are stricter about it. */
export function CookingNotes({ variant, plain }: { variant: FoodVariant; plain: FoodVariant | undefined }) {
  const { t, num } = useI18n();
  const delta = variant.versus_default;
  return (
    <div className="grid gap-4">
      {delta && plain && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-muted px-4 py-3 text-subhead">
          <span className="text-muted-foreground">
            {t.food.versus} {plain.name}
          </span>
          <strong className={cn('tabular-nums', delta.kcal > 0.5 ? 'text-limit-ink' : 'text-recommended-ink')}>
            {signed(delta.kcal, (value) => `${num(Math.round(value))} ${t.food.kcal}`)}
          </strong>
          <strong className={cn('tabular-nums', delta.fat_g > 0.5 ? 'text-limit-ink' : 'text-recommended-ink')}>
            {signed(delta.fat_g, (value) => `${num(Math.round(value * 10) / 10)} g ${t.food.fat.toLowerCase()}`)}
          </strong>
        </p>
      )}
      {variant.verdicts.length > 0 && (
        <div className="grid gap-2.5">
          <h3 className="text-headline">{t.food.stricter}</h3>
          <ul className="grid gap-2.5 md:grid-cols-2">
            {variant.verdicts.map((entry) => (
              <li key={entry.condition.slug} className="grid gap-2 rounded-xl border bg-card p-4" style={tone(entry.condition.color)}>
                <p className="flex flex-wrap items-center gap-2 text-subhead font-semibold">
                  <i className="dot" /> {entry.condition.name} <VerdictBadge verdict={entry.verdict} />
                </p>
                <p className="text-subhead text-muted-foreground">{entry.reason}</p>
                {entry.source && (
                  <p className="text-footnote text-muted-foreground">
                    {entry.source.url ? (
                      <a href={entry.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
                        {entry.source.publisher}: {entry.source.title} <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="font-semibold">
                        {entry.source.publisher}: {entry.source.title}
                      </span>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
