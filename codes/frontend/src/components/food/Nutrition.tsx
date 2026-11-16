// A food's nutrition per 100 g: ways to cook it as choice cards when variants carry cooking methods (egg boiled / poached / fried…),
// else a type switcher (default first: chicken breast / thigh / …), the
// energy big, protein / carbs / fat as a ring (kit Donut) with their grams, then fibre, sugar, saturated fat and the minerals as
// compact rows, and the source linked. No variants: a small note — never invented numbers. A value the source did not report says so.
import { Donut } from '@/components/charts';
import { Utensils } from '@/components/icons';
import { ExternalLink, Info } from '@/components/icons/page';
import { CookingNotes, CookingPicker } from '@/components/food/Cooking';
import { GlycemicPanel } from '@/components/food/Glycemic';
import { SectionTitle } from '@/components/kit/section';
import { CountUp } from '@/components/kit/countup';
import { Segmented } from '@/components/ui/segmented';
import { useI18n } from '@/lib/i18n';
import type { FoodVariant, Glycemic, Nutrients } from '@/lib/types';

type Dictionary = ReturnType<typeof useI18n>['t'];

const TINTS = ['var(--tint-mint)', 'var(--tint-butter)', 'var(--tint-blush)', 'var(--tint-sky)'];

const round = (value: number) => (value >= 100 ? Math.round(value) : Math.round(value * 10) / 10);

function Macros({ nutrients, t }: { nutrients: Nutrients; t: Dictionary }) {
  const { num } = useI18n();
  const slices = [
    { key: 'protein', label: t.food.protein, value: nutrients.protein_g, color: 'var(--river)' },
    { key: 'carbs', label: t.food.carbs, value: nutrients.carb_g, color: 'var(--saffron)' },
    { key: 'fat', label: t.food.fat, value: nutrients.fat_g, color: 'var(--coral)' },
  ].filter((slice): slice is { key: string; label: string; value: number; color: string } => slice.value !== null);
  if (slices.length === 0) return null;
  return (
    <Donut
      data={slices}
      total={nutrients.kcal === null ? '—' : num(Math.round(nutrients.kcal))}
      center={t.food.kcal}
      format={(value) => `${num(round(value))} g`}
      ariaLabel={`${t.food.macros} ${t.food.per100}`}
    />
  );
}

function Rows({ nutrients, t }: { nutrients: Nutrients; t: Dictionary }) {
  const rows: [string, number | null, string][] = [
    [t.food.fibre, nutrients.fibre_g, 'g'],
    [t.food.sugar, nutrients.sugar_g, 'g'],
    [t.food.satFat, nutrients.sat_fat_g, 'g'],
    [t.food.sodium, nutrients.sodium_mg, 'mg'],
    [t.food.potassium, nutrients.potassium_mg, 'mg'],
    [t.food.iron, nutrients.iron_mg, 'mg'],
    [t.food.calcium, nutrients.calcium_mg, 'mg'],
  ];
  // FlavorFit: the four that matter most for the conditions as pastel tiles, the minerals as quiet rows under them
  const tiles = rows.slice(0, 4);
  const rest = rows.slice(4);
  return (
    <div className="grid content-start gap-3">
      <dl className="grid grid-cols-2 gap-2.5">
        {tiles.map(([label, value, unit], position) => (
          <div key={label} className="pastel grid gap-1 p-3.5" style={{ ['--tile' as string]: TINTS[position] }}>
            <dt className="text-caption font-semibold opacity-75">{label}</dt>
            <dd className="text-title-3 font-extrabold tabular-nums">
              {value === null ? <span className="text-footnote font-normal opacity-70">{t.food.notReported}</span> : <><CountUp value={round(value)} digits={value >= 100 ? 0 : 1} /> <span className="text-footnote font-semibold opacity-70">{unit}</span></>}
            </dd>
          </div>
        ))}
      </dl>
      <dl className="grid content-start divide-y">
        {rest.map(([label, value, unit]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-2.5 text-subhead">
            <dt className="text-muted-foreground">{label}</dt>
            {value === null ? (
              <dd className="text-footnote text-faint-foreground">{t.food.notReported}</dd>
            ) : (
              <dd className="font-semibold tabular-nums">
                <CountUp value={round(value)} digits={value >= 100 ? 0 : 1} /> {unit}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}

function Panel({ variant }: { variant: FoodVariant }) {
  const { t } = useI18n();
  const energy = variant.per_100g.kcal;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-6">
        <p className="flex items-baseline gap-2">
          {energy === null ? (
            <span className="numeral text-[56px] leading-none">—</span>
          ) : (
            <CountUp value={Math.round(energy)} className="numeral text-[56px] leading-none" />
          )}
          <span className="text-callout text-muted-foreground">
            {t.food.kcal} · {t.food.per100}
          </span>
        </p>
        <Macros nutrients={variant.per_100g} t={t} />
      </div>
      <div className="grid content-start gap-3 self-start">
        <h3 className="text-headline">{t.food.more}</h3>
        <Rows nutrients={variant.per_100g} t={t} />
      </div>
    </div>
  );
}

function SourceLine({ variant }: { variant: FoodVariant }) {
  const { t } = useI18n();
  return (
    <p className="flex flex-wrap items-center gap-1.5 border-t pt-4 text-footnote text-muted-foreground">
      {t.food.source}:
      {variant.source_url ? (
        <a href={variant.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
          {variant.source} <ExternalLink size={13} />
        </a>
      ) : (
        <span className="font-semibold">{variant.source}</span>
      )}
    </p>
  );
}

type NutritionProps = { variants: FoodVariant[]; bestWay: string | null; glycemic: Glycemic | null; chosen: string; setChosen: (slug: string) => void };

/** The chosen variant is held by the page, so the hero's gallery can show the same way of cooking. */
export function Nutrition({ variants, bestWay, glycemic, chosen, setChosen }: NutritionProps) {
  const { t } = useI18n();
  const ordered = [...variants].sort((left, right) => Number(right.is_default) - Number(left.is_default));
  const variant = ordered.find((item) => item.slug === chosen) ?? ordered[0];
  // two or more ways of cooking: choice cards with calories and added fat instead of a plain type switch
  const cooking = new Set(ordered.map((item) => item.method).filter(Boolean)).size >= 2;
  return (
    <section aria-labelledby="nutrition-title" className="surface rounded-2xl p-5 sm:p-7">
      <SectionTitle icon={Utensils} id="nutrition-title" title={t.food.nutrition} lead={t.food.nutritionLead} accent="saffron">
        {ordered.length > 1 && !cooking && (
          <div className="min-w-0 max-w-full">
            <Segmented label={t.food.type} value={variant?.slug ?? ''} onChange={setChosen} options={ordered.map((item) => ({ value: item.slug, label: item.name }))} />
          </div>
        )}
      </SectionTitle>
      {!variant && (
        <p className="flex items-center gap-2.5 rounded-lg bg-muted p-4 text-subhead text-muted-foreground">
          <Info size={18} /> {t.food.coming}
        </p>
      )}
      {!variant && glycemic && <GlycemicPanel glycemic={glycemic} className="mt-6" />}
      {variant && (
        <div className="grid gap-6">
          {cooking && (
            <div className="grid gap-3">
              <p className="text-subhead text-muted-foreground">
                <strong className="text-foreground">{t.food.waysToCook}.</strong> {t.food.waysLead}
              </p>
              <CookingPicker variants={ordered} chosen={variant.slug} best={bestWay} onChoose={setChosen} />
            </div>
          )}
          <Panel variant={variant} />
          {cooking && <CookingNotes variant={variant} plain={ordered[0]} />}
          {/* the chosen way of cooking's own GI, else the food's GI for the form it was measured in (the default) */}
          {(variant.glycemic ?? (variant.is_default ? glycemic : null)) && (
            <GlycemicPanel glycemic={(variant.glycemic ?? glycemic) as Glycemic} />
          )}
          <SourceLine variant={variant} />
        </div>
      )}
    </section>
  );
}
