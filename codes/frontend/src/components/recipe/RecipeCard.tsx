// A recipe as FlavorFit's card: a white card with the dish photo inset and rounded inside it (a video badge when there is a
// cooking video), the title, one line, grey meta chips (kind, time, servings, ingredients), the difficulty in chef hats, and — for the
// reader's own conditions (every condition when they have none) — a dot per condition coloured by how the dish fits, and
// how many of them it is fine for.
import { Photo } from '@/components/kit/photo';
import { ChefHat, Clock, People, Youtube } from '@/components/icons/page';
import { useI18n, useT } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { RecipeCard as Card } from '@/lib/types';
import { cn } from '@/lib/utils';

const VERDICT_TONE = { avoid: 'var(--avoid)', limit: 'var(--limit)', ok: 'var(--ok)', recommended: 'var(--recommended)' } as const;
const HATS = { easy: 1, medium: 2, hard: 3 } as const;
const HAT_INK = { easy: 'var(--recommended-ink)', medium: 'var(--limit-ink)', hard: 'var(--avoid-ink)' } as const;
const chip = 'inline-flex h-7 items-center gap-1 rounded-full bg-muted px-2.5 text-caption font-semibold text-foreground/75';

export function RecipeCard({ recipe, mine = [], sizes, className }: { recipe: Card; mine?: string[]; sizes: string; className?: string | undefined }) {
  const { t, num } = useI18n();
  const translate = useT();
  // the reader's own conditions when they have some, else every condition (so the card always says how widely it fits)
  const fit = mine.length > 0 ? recipe.fit.filter((entry) => mine.includes(entry.condition.slug)) : recipe.fit;
  const fine = fit.filter((entry) => entry.verdict === 'ok' || entry.verdict === 'recommended').length;
  return (
    <a href={`/recipe/${recipe.slug}`} onClick={onLink} className={cn('surface group flex flex-col gap-3 rounded-[26px] p-2.5', className)}>
      <div className="relative overflow-hidden rounded-[20px]">
        <Photo src={recipe.image} alt={recipe.title} ratio="4 / 3" sizes={sizes} zoom tone="#e8a33d" />
        {recipe.has_video && (
          <span className="absolute bottom-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md" title={t.video.label}>
            <Youtube size={16} />
            <span className="sr-only">{t.video.label}</span>
          </span>
        )}
      </div>
      <div className="grid flex-1 content-start gap-2 px-1.5 pb-1.5">
        <h3 className="text-headline font-bold leading-snug">{recipe.title}</h3>
        <p className="line-clamp-2 text-footnote text-muted-foreground">{recipe.summary}</p>
        <div className="flex flex-wrap gap-1">
          <span className={chip}>{t.recipes.kinds[recipe.kind]}</span>
          <span className={chip}><Clock size={13} /> {num(recipe.minutes)} {t.recipes.minutes}</span>
          <span className={chip}><People size={13} /> {num(recipe.servings)}</span>
          <span className={chip}>{translate('recipes.ingredientCount', recipe.ingredient_count)}</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2.5">
          <span className="inline-flex items-center gap-1 text-caption font-bold" style={{ color: HAT_INK[recipe.difficulty] }}>
            <span className="flex -space-x-1" aria-hidden>
              {Array.from({ length: HATS[recipe.difficulty] }, (_, index) => <ChefHat key={index} size={14} />)}
            </span>
            {t.recipes.difficulty[recipe.difficulty]}
          </span>
          {fit.length > 0 && (
            <span className="flex items-center gap-1.5" aria-label={fit.map((entry) => `${entry.condition.name}: ${t.verdict[entry.verdict]}`).join(', ')} title={translate('recipes.fitCount', fine, fit.length)}>
              <span aria-hidden className="text-caption font-bold tabular-nums text-muted-foreground">{num(fine)}/{num(fit.length)}</span>
              {fit.map((entry) => (
                <i key={entry.condition.slug} title={`${entry.condition.name}: ${t.verdict[entry.verdict]}`} className="size-2.5 rounded-full ring-2 ring-card" style={{ background: VERDICT_TONE[entry.verdict] }} />
              ))}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
