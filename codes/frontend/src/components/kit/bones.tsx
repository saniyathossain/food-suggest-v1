// Placeholders shaped like the content they stand for (Shell Console's bones): the same boxes, sizes and gaps as the real thing, so
// nothing jumps when the data lands. The shimmer is one calm wave; under reduced motion it is a still block.
import { cn } from '@/lib/utils';

export function Bone({ className = '' }: Readonly<{ className?: string | undefined }>) {
  return <span aria-hidden className={cn('shimmer block', !/(^|\s)rounded/.test(className) && 'rounded-md', className)} />;
}

/** A line of text. */
export function TextBone({ className = '' }: Readonly<{ className?: string | undefined }>) {
  // no class merging here (cn is plain clsx), so a default height or width is only added when the caller gave none
  const has = (prefix: string) => className.split(/\s+/).some((name) => name.replace(/^[a-z0-9]+:/, '').startsWith(prefix));
  return <Bone className={cn(!has('rounded') && 'rounded-full', !has('h-') && 'h-4', !has('w-') && 'w-full', className)} />;
}

/** A photo card: picture, title, two lines. */
export function CardBone({ ratio = 'aspect-[16/10]', className }: Readonly<{ ratio?: string | undefined; className?: string | undefined }>) {
  return (
    <div aria-hidden className={cn('surface overflow-hidden rounded-xl', className)}>
      <Bone className={cn('w-full rounded-none', ratio)} />
      <div className="grid gap-3 p-5">
        <TextBone className="h-5 w-2/3" />
        <TextBone />
        <TextBone className="w-4/5" />
      </div>
    </div>
  );
}

/** A food row: square thumb and two lines. */
export function RowBone() {
  return (
    <div aria-hidden className="flex items-center gap-3 py-2">
      <Bone className="size-12 shrink-0 rounded-md" />
      <div className="grid flex-1 gap-2">
        <TextBone className="w-1/2" />
        <TextBone className="h-3 w-4/5" />
      </div>
    </div>
  );
}

/** A heading with its icon chip. */
export function TitleBone() {
  return (
    <div aria-hidden className="mb-5 flex items-center gap-3.5">
      <Bone className="size-11 rounded-lg" />
      <div className="grid flex-1 gap-2">
        <TextBone className="h-6 w-56 max-w-full" />
        <TextBone className="h-3.5 w-80 max-w-full" />
      </div>
    </div>
  );
}

/** A grid of cards. */
export function GridBones({ count = 6, ratio, className }: Readonly<{ count?: number | undefined; ratio?: string | undefined; className?: string | undefined }>) {
  return (
    <div aria-busy="true" className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }, (_, index) => (
        <CardBone key={index} ratio={ratio} />
      ))}
    </div>
  );
}

/** A shelf of cards (a carousel). */
export function ShelfBones({ count = 4 }: Readonly<{ count?: number | undefined }>) {
  return (
    <div aria-busy="true" className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }, (_, index) => (
        <CardBone key={index} ratio="aspect-[4/3]" className="w-[min(78vw,280px)] shrink-0" />
      ))}
    </div>
  );
}

/** Verdict lanes (components/Lanes.tsx): a tinted header with its tile, then food rows; a side-scrolling rail on a phone. */
export function LaneBones({ count = 4 }: Readonly<{ count?: number | undefined }>) {
  return (
    <div aria-busy="true" className="rail -mx-[clamp(14px,2.4vw,32px)] items-start gap-4 px-[clamp(14px,2.4vw,32px)] pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4 [&>*]:shrink-0">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="surface flex w-[min(84vw,360px)] flex-col overflow-hidden rounded-xl md:w-auto">
          <div className="mb-2 flex items-center gap-3 bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] p-4">
            <Bone className="size-10 shrink-0" />
            <div className="grid flex-1 gap-2">
              <TextBone className="h-4 w-20" />
              <TextBone className="h-3 w-32" />
            </div>
            <Bone className="h-7 w-7 rounded-md" />
          </div>
          <div className="grid gap-1 px-4 pb-4">
            {[0, 1, 2, 3].map((row) => (
              <RowBone key={row} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A food card (components/FoodCard.tsx): the picture inset in the card, name, category, the energy strip, verdicts. */
export function FoodCardBone({ ratio = 'aspect-[16/9]' }: Readonly<{ ratio?: string | undefined }>) {
  return (
    <div aria-hidden className="surface flex flex-col gap-1 rounded-[26px] p-2.5">
      <Bone className={cn('w-full rounded-[20px]', ratio)} />
      <div className="grid gap-2 px-2 pb-2 pt-2.5">
        <TextBone className="h-5 w-3/5" />
        <TextBone className="h-3 w-2/5" />
        <Bone className="h-12 w-full rounded-2xl" />
        {[0, 1].map((row) => (
          <div key={row} className="flex items-center justify-between gap-3 pt-1">
            <TextBone className="h-3 w-1/2" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The food lookup grid: the same columns as the results. */
export function FoodGridBones({ count = 8 }: Readonly<{ count?: number | undefined }>) {
  return (
    <div aria-busy="true" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-8">
      <TextBone className="col-span-full -mb-3 h-3 w-20" />
      {Array.from({ length: count }, (_, index) => (
        <FoodCardBone key={index} />
      ))}
    </div>
  );
}

/** A recipe card (components/recipe/RecipeCard.tsx): photo, title, two lines, three chips, the difficulty footer. */
export function RecipeCardBone({ className }: Readonly<{ className?: string | undefined }>) {
  return (
    <div aria-hidden className={cn('surface flex flex-col gap-3 rounded-[26px] p-2.5', className)}>
      <Bone className="aspect-[4/3] w-full rounded-[20px]" />
      <div className="grid gap-2 px-1.5 pb-1.5">
        <TextBone className="h-5 w-3/4" />
        <TextBone className="h-3" />
        <TextBone className="h-3 w-4/5" />
        <div className="flex gap-1 pt-0.5">
          <Bone className="h-6 w-14 rounded-full" />
          <Bone className="h-6 w-16 rounded-full" />
          <Bone className="h-6 w-10 rounded-full" />
          <Bone className="h-6 w-20 rounded-full" />
        </div>
        <div className="border-t pt-2.5">
          <TextBone className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

/** The recipes page under its banner: the recommended shelf, then the full grid. */
export function RecipeListBones() {
  return (
    <div aria-busy="true" className="grid gap-12">
      <div className="grid gap-3">
        <div className="flex items-center gap-2.5">
          <Bone className="size-8 rounded-lg" />
          <TextBone className="h-4 w-32" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((index) => (
            <RecipeCardBone key={index} className="w-[min(78vw,290px)] shrink-0" />
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <TextBone className="h-4 w-40" />
        <div className="grid gap-5 sm:grid-cols-2">
          <RecipeCardBone />
          <RecipeCardBone />
        </div>
      </div>
    </div>
  );
}

function ArticleCardBone({ lead = false }: Readonly<{ lead?: boolean }>) {
  return (
    <div aria-hidden className={cn('surface grid overflow-hidden rounded-2xl', lead && 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]')}>
      <Bone className={cn('w-full rounded-none', lead ? 'aspect-[16/10]' : 'aspect-[16/9]')} />
      <div className={cn('grid content-start gap-2.5 p-5', lead && 'md:content-center md:p-8')}>
        <div className="flex gap-1.5">
          <Bone className="h-5 w-20 rounded-full" />
          <Bone className="h-5 w-24 rounded-full" />
        </div>
        <TextBone className={cn('w-4/5', lead ? 'h-8' : 'h-5')} />
        {lead && <TextBone className="h-8 w-3/5" />}
        <TextBone className="h-3" />
        <TextBone className="h-3 w-11/12" />
        <TextBone className="h-3 w-2/3" />
        <TextBone className="mt-1 h-3 w-20" />
      </div>
    </div>
  );
}

/** The reading list: the lead article wide, the rest three across. */
export function ArticleListBones() {
  return (
    <div aria-busy="true" className="grid gap-5">
      <ArticleCardBone lead />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ArticleCardBone />
        <ArticleCardBone />
        <ArticleCardBone />
      </div>
    </div>
  );
}

/** The plans (pages/Pricing.tsx): name, summary, price, eight feature rows, the button. */
export function TierBones() {
  return (
    <div aria-busy="true" className="grid gap-5 md:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="surface grid content-start gap-5 rounded-[28px] p-6">
          <div className="grid gap-2">
            <TextBone className="h-5 w-20" />
            <TextBone className="h-3 w-4/5" />
          </div>
          <TextBone className="h-9 w-24 rounded-lg" />
          <div className="grid gap-3">
            {Array.from({ length: 8 }, (_, row) => (
              <div key={row} className="flex items-center justify-between gap-3">
                <TextBone className="h-3 w-1/2" />
                <TextBone className="h-3 w-10" />
              </div>
            ))}
          </div>
          <Bone className="h-10 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}
