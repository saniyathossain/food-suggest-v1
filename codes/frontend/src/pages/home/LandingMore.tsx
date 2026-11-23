// More of the front page for a visitor: what is inside (real counts from the catalogue), a shelf of articles, the sources it is
// built on, and common questions. Its own chunk, loaded after the first paint.
import { ArrowRight, BookOpen, Check, ShieldKey } from '@/components/icons/page';
import { Carousel } from '@/components/kit/carousel';
import { GlowBars, GlowCard, GlowLine } from '@/components/kit/glow';
import { SectionTitle } from '@/components/kit/section';
import { ArticleCard } from '@/pages/Read';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { Bootstrap, FoodSearch, PostCard, RecipeCard } from '@/lib/types';

const SOURCES = ['NHS', 'WHO', 'NIH · MedlinePlus', 'Harvard T.H. Chan', 'British Heart Foundation', 'Diabetes UK', 'USDA FoodData Central', 'Bangladesh Dietary Guidelines'];

function Inside({ boot }: { boot: Bootstrap }) {
  const { t, lang, num } = useI18n();
  const { data: foods } = useResource<FoodSearch[]>(endpoints.foods(lang, '', ''));
  const { data: recipes } = useResource<RecipeCard[]>(endpoints.recipes(lang));
  const month = new Date().getMonth();
  const monthName = (index: number) => new Date(2026, index, 1).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { month: 'short' });
  const perMonth = Array.from({ length: 12 }, (_, index) => foods?.filter((food) => food.season.includes(index + 1)).length ?? 0);
  const rules = boot.conditions.map((item) => item.counts.avoid + item.counts.limit + item.counts.ok + item.counts.recommended);
  const minutes = (recipes ?? []).map((recipe) => recipe.minutes);
  const videos = recipes?.filter((recipe) => recipe.has_video).length ?? 0;
  const topRules = Math.max(0, ...rules);
  return (
    <section aria-labelledby="inside-title" className="grid gap-8">
      <div className="grid gap-2">
        <h2 id="inside-title" className="text-[clamp(28px,3vw,40px)]">{t.more.insideTitle}</h2>
        <p className="text-callout text-muted-foreground">{t.more.insideLead}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3 xl:gap-7">
        <GlowCard
          glow="green"
          label={t.more.foodsLabel.replace('{n}', num(foods?.length ?? 0)).replace('{m}', num(perMonth[month] ?? 0))}
          statement={t.more.foodsLine}
          word={t.more.foodsWord}
          chart={foods && <GlowLine values={perMonth} mark={month} markLabel={`${monthName(month)} · ${num(perMonth[month] ?? 0)}`} title={t.dash.perMonth} />}
        />
        <GlowCard
          glow="violet"
          label={t.more.conditionsLabel.replace('{n}', num(boot.conditions.length))}
          statement={t.more.conditionsLine}
          word={t.more.conditionsWord}
          chart={<GlowBars values={rules} labels={boot.conditions.map((item) => item.name)} title={t.more.rulesTitle} markLabel={t.more.rules.replace('{n}', num(topRules))} />}
        />
        <GlowCard
          glow="amber"
          label={t.more.recipesLabel.replace('{n}', num(recipes?.length ?? 0)).replace('{m}', num(videos))}
          statement={t.more.recipesLine}
          word={t.more.recipesWord}
          chart={recipes && <GlowBars values={minutes} labels={recipes.map((recipe) => recipe.title)} title={t.more.minutesTitle} markLabel={`${num(Math.max(0, ...minutes))} ${t.recipes.minutes}`} />}
        />
      </div>
    </section>
  );
}

function Articles() {
  const { t, lang } = useI18n();
  const { data } = useResource<PostCard[]>(endpoints.posts(lang));
  if (!data || data.length === 0) return null;
  return (
    <section aria-labelledby="articles-title">
      <SectionTitle icon={BookOpen} id="articles-title" title={t.more.readTitle} lead={t.more.readLead}>
        <a href="/read" onClick={onLink} className="press inline-flex h-10 items-center gap-1.5 rounded-full border bg-card px-4 text-subhead font-semibold hover:bg-muted">
          {t.more.allArticles} <ArrowRight size={16} />
        </a>
      </SectionTitle>
      <Carousel label={t.more.readTitle} previous={t.common.previous} next={t.common.next}>
        {data.slice(0, 8).map((post) => (
          <div key={post.slug} className="flex w-[min(82vw,340px)] flex-col *:flex-1">
            <ArticleCard post={post} />
          </div>
        ))}
      </Carousel>
    </section>
  );
}

function Trust() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="trust-title" className="surface grid gap-6 rounded-[30px] p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
      <div className="grid gap-3">
        <span className="grid size-12 place-items-center rounded-xl border bg-card"><ShieldKey size={22} /></span>
        <h2 id="trust-title" className="text-[clamp(26px,2.6vw,34px)]">{t.more.trustTitle}</h2>
        <p className="text-callout text-muted-foreground">{t.more.trustLead}</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {SOURCES.map((source) => (
          <li key={source} className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-4 py-2 text-subhead font-semibold">
            <Check size={15} className="text-recommended-ink" /> {source}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Questions() {
  const { t } = useI18n();
  const items = t.more.faq.split(';;').map((pair) => pair.split('||') as [string, string]);
  return (
    <section aria-labelledby="faq-title" className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="grid content-start gap-2">
        <h2 id="faq-title" className="text-[clamp(28px,3vw,40px)]">{t.more.faqTitle}</h2>
        <p className="text-callout text-muted-foreground">{t.more.faqLead}</p>
      </div>
      <div className="grid gap-3">
        {items.map(([question, answer]) => (
          <details key={question} className="surface group rounded-[22px] p-5 open:pb-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-callout font-semibold [&::-webkit-details-marker]:hidden">
              {question}
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-subhead text-muted-foreground">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function LandingMore({ boot }: { boot: Bootstrap }) {
  return (
    <>
      <Inside boot={boot} />
      <Articles />
      <Trust />
      <Questions />
    </>
  );
}
