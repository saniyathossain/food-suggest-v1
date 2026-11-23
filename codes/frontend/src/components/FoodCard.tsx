// A food as a card: the dish cut out on a soft tile, lifting under the pointer (else its photo, zooming a touch), its name, its group, the season and imported badges, and
// its energy and macros per 100 g, and how it sits with each condition. The whole card links to /food/:slug.
import type { ReactNode } from 'react';
import { CategoryIcon } from '@/components/icons';
import { MacroStrip } from '@/components/food/MacroStrip';
import { Cutout } from '@/components/kit/cutout';
import { Artwork } from '@/components/kit/artwork';
import { Photo } from '@/components/kit/photo';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { FoodSearch } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = { food: FoodSearch; category?: string | undefined; sizes: string; ratio?: string | undefined; className?: string | undefined; children?: ReactNode };

/** Badges laid over a photo: frosted pills that stay readable on any picture, each with a coloured dot for what it says. */
export function FoodBadges({ inSeason, imported, gi = null, age = null }: { inSeason: boolean; imported: boolean; gi?: number | null | undefined; age?: number | null | undefined }) {
  const { t, num } = useI18n();
  return (
    <>
      {inSeason && (
        <span className="photo-badge">
          <i aria-hidden style={{ background: 'var(--mango)' }} /> {t.foods.inSeason}
        </span>
      )}
      {imported && (
        <span className="photo-badge">
          <i aria-hidden style={{ background: 'var(--tone-sky)' }} /> {t.foods.imported}
        </span>
      )}
      {age !== null && (
        <span className="photo-badge">
          <i aria-hidden style={{ background: 'var(--tone-rose)' }} />
          {age === 0 ? t.baby.fromBirth : t.baby.fromMonths.replace('{n}', num(age))}
        </span>
      )}
      {gi !== null && (
        <span className="photo-badge">
          <i aria-hidden style={{ background: gi <= 55 ? 'var(--recommended)' : gi < 70 ? 'var(--limit)' : 'var(--avoid)' }} />
          GI {num(gi)}
        </span>
      )}
    </>
  );
}

export function FoodCard({ food, category, sizes, ratio = '4 / 3', className, children }: Props) {
  return (
    <a href={`/food/${food.slug}`} onClick={onLink} className={cn('surface group flex flex-col gap-1 rounded-[26px] p-2.5', className)}>
      <div className="relative overflow-hidden rounded-[20px] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]">
        {/* the picture itself, no backdrop: a transparent dish sits on the card and lifts under the pointer; a photo fills the top */}
        <div className="relative grid" style={{ aspectRatio: ratio }}>
          {food.cutout ? (
            <span className="absolute inset-x-[9%] bottom-[4%] top-[12%]">
              <Cutout src={food.cutout} alt={food.name} ratio="auto" sizes={sizes} zoom className="size-full" />
            </span>
          ) : food.image ? (
            <span className="absolute inset-0">
              <Photo src={food.image} alt={food.name} ratio="auto" sizes={sizes} zoom className="size-full" />
            </span>
          ) : (
            <Artwork category={food.category} name={food.name} />
          )}
        </div>
        <span className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          <FoodBadges inSeason={food.in_season} imported={food.origin === 'imported'} gi={food.gi} age={food.age_from_months} />
        </span>
      </div>
      <div className="grid flex-1 content-start gap-1 px-2 pb-2 pt-2">
        <h3 className="text-headline font-semibold">{food.name}</h3>
        {category && <p className="flex items-center gap-1.5 text-footnote text-muted-foreground"><CategoryIcon slug={food.category} size={15} /> {category}</p>}
        {food.macros && <MacroStrip macros={food.macros} />}
        {children}
      </div>
    </a>
  );
}
