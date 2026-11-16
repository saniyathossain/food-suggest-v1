// The skeleton of each page, shaped like it (Shell Console's RouteSkeleton): the Suspense fallback while a page's code arrives, and
// what a page shows while its first data (or the data in a new language) is on the way.
import { cn } from '@/lib/utils';
import { Bone, CardBone, FoodGridBones, LaneBones, RowBone, ShelfBones, TextBone, TitleBone } from '@/components/kit/bones';

export type PageShape = 'home' | 'condition' | 'plan' | 'foods' | 'food' | 'recipe' | 'article' | 'bmi' | 'admin';

function HomeBones() {
  return (
    <>
      <Bone className="h-[min(72vh,620px)] w-full rounded-none" />
      <div className="page grid gap-12">
        <div className="surface grid gap-4 rounded-xl p-6">
          <TextBone className="h-6 w-60" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Bone key={index} className="h-10 w-32 rounded-full" />
            ))}
          </div>
        </div>
        <div>
          <TitleBone />
          <ShelfBones />
        </div>
      </div>
    </>
  );
}

/** pages/Condition.tsx under its back link: the 21:9 photo header (name over it), the three tabs, the verdict lanes. */
export function ConditionBones() {
  return (
    <div aria-busy="true" className="grid gap-8">
      <div className="relative">
        <Bone className="aspect-[21/9] min-h-[300px] w-full rounded-2xl" />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 sm:p-8">
          <span className="size-16 shrink-0 rounded-xl bg-card/70 sm:size-20" />
          <div className="grid flex-1 gap-2.5">
            <span className="block h-9 w-48 max-w-full rounded-full bg-card/70" />
            <span className="block h-3.5 w-96 max-w-full rounded-full bg-card/50" />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Bone className="h-10 w-24 rounded-full" />
        <Bone className="h-10 w-32 rounded-full" />
        <Bone className="h-10 w-24 rounded-full" />
      </div>
      <LaneBones />
    </div>
  );
}

/** pages/Recipe.tsx: the breadcrumb, the photo-and-facts header card, the video beside its note. */
function RecipeBones() {
  return (
    <div className="grid gap-10">
      <TextBone className="h-4 w-56" />
      <div className="surface grid gap-6 rounded-[32px] p-3 sm:p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
        <Bone className="aspect-[4/3] w-full rounded-[24px]" />
        <div className="grid content-center gap-5 px-2 pb-3 lg:px-0 lg:py-4 lg:pr-6">
          <div className="grid gap-3">
            <TextBone className="h-11 w-4/5 rounded-xl" />
            <TextBone className="h-11 w-1/2 rounded-xl" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['w-20', 'w-24', 'w-24', 'w-16'].map((width, index) => (
              <Bone key={index} className={cn('h-7 rounded-full', width)} />
            ))}
          </div>
          <div className="grid gap-2">
            <TextBone className="h-3.5" />
            <TextBone className="h-3.5 w-3/4" />
          </div>
          <div className="flex gap-5">
            <TextBone className="h-4 w-20" />
            <TextBone className="h-4 w-20" />
            <TextBone className="h-4 w-24" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 6 }, (_, index) => (
              <Bone key={index} className="h-6 w-28 rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <Bone className="aspect-video w-full rounded-[28px]" />
        <div className="order-first grid content-start gap-3 lg:order-none lg:pt-2">
          <div className="flex items-center gap-2.5">
            <Bone className="size-9 rounded-xl" />
            <TextBone className="h-6 w-44" />
          </div>
          <TextBone className="h-3.5" />
          <TextBone className="h-3.5 w-2/3" />
        </div>
      </div>
    </div>
  );
}

/** pages/Article.tsx: the hero (words beside the cover), then the reading column beside its sources. */
function ArticleBones() {
  return (
    <div className="grid gap-10">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
        <div className="grid max-w-[760px] gap-5">
          <TextBone className="h-4 w-28" />
          <TextBone className="h-3 w-24" />
          <div className="grid gap-3">
            <TextBone className="h-12 w-11/12 rounded-xl" />
            <TextBone className="h-12 w-3/5 rounded-xl" />
          </div>
          <div className="grid gap-2.5">
            <TextBone />
            <TextBone className="w-4/5" />
          </div>
        </div>
        <Bone className="aspect-[4/3] w-full rounded-[28px]" />
      </div>
      <div className="grid gap-10 border-t pt-10 lg:grid-cols-[minmax(0,720px)_minmax(0,1fr)] lg:gap-16">
        <div className="grid gap-3">
          {['w-full', 'w-full', 'w-11/12', 'w-2/3'].map((width, index) => (
            <TextBone key={index} className={cn('h-4', width)} />
          ))}
          <TextBone className="mt-5 h-6 w-1/2" />
          {['w-full', 'w-full', 'w-4/5'].map((width, index) => (
            <TextBone key={index} className={cn('h-4', width)} />
          ))}
        </div>
        <div className="grid content-start gap-3">
          <TextBone className="h-5 w-24" />
          <TextBone className="h-3.5" />
          <TextBone className="h-3.5 w-3/4" />
          <Bone className="mt-3 h-20 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function FoodBones() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-6 md:grid-cols-[minmax(0,420px)_1fr]">
        <Bone className="aspect-square w-full rounded-2xl" />
        <div className="grid content-center gap-4">
          <TextBone className="h-4 w-32" />
          <TextBone className="h-10 w-2/3" />
          <div className="flex gap-2">
            <Bone className="h-8 w-28 rounded-full" />
            <Bone className="h-8 w-28 rounded-full" />
          </div>
        </div>
      </div>
      <div className="surface grid gap-4 rounded-xl p-6">
        <TitleBone />
        <Bone className="h-40 w-full" />
      </div>
    </div>
  );
}

function PlanBones() {
  return (
    <div className="grid gap-8">
      <Bone className="h-16 w-full rounded-xl" />
      <TitleBone />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <CardBone key={index} ratio="aspect-[3/2]" />
        ))}
      </div>
      <LaneBones count={3} />
    </div>
  );
}

function AdminBones() {
  return (
    <div className="grid gap-6">
      <Bone className="h-11 w-full max-w-2xl rounded-full" />
      <div className="surface grid gap-2 rounded-xl p-6">
        {Array.from({ length: 6 }, (_, index) => (
          <RowBone key={index} />
        ))}
      </div>
    </div>
  );
}

function BmiBones() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Bone className="h-80 rounded-xl" />
      <Bone className="h-80 rounded-xl" />
    </div>
  );
}

export function PageBones({ shape }: Readonly<{ shape: PageShape }>) {
  if (shape === 'home') return <HomeBones />;
  return (
    <main className="page" aria-busy="true">
      {shape === 'condition' && <ConditionBones />}
      {shape === 'food' && <FoodBones />}
      {shape === 'recipe' && <RecipeBones />}
      {shape === 'article' && <ArticleBones />}
      {shape === 'plan' && <PlanBones />}
      {shape === 'admin' && <AdminBones />}
      {shape === 'bmi' && <BmiBones />}
      {shape === 'foods' && (
        <div className="grid gap-6">
          <TextBone className="h-10 w-72" />
          <Bone className="h-14 w-full rounded-full" />
          <FoodGridBones />
        </div>
      )}
    </main>
  );
}
