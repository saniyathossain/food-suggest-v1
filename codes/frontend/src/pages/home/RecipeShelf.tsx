// Recipes on the front page: a shelf of the dishes with cooking videos, and the way to all of them.
import { ArrowRight, ChefHat } from '@/components/icons/page';
import { Carousel } from '@/components/kit/carousel';
import { SectionTitle } from '@/components/kit/section';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { RecipeCard as Card } from '@/lib/types';

export default function RecipeShelf() {
  const { t, lang } = useI18n();
  const { data } = useResource<Card[]>(endpoints.recipes(lang));
  if (!data || data.length === 0) return null;
  return (
    <section aria-labelledby="shelf-title">
      <SectionTitle icon={ChefHat} id="shelf-title" title={t.landing.recipesTitle} lead={t.landing.recipesLead}>
        <a href="/recipes" onClick={onLink} className="press inline-flex h-10 items-center gap-1.5 rounded-full border bg-card px-4 text-subhead font-semibold hover:bg-muted">
          {t.landing.allRecipes} <ArrowRight size={16} />
        </a>
      </SectionTitle>
      <Carousel label={t.landing.recipesTitle} previous={t.common.previous} next={t.common.next}>
        {data.slice(0, 10).map((recipe) => (
          <RecipeCard key={recipe.slug} recipe={recipe} sizes="(max-width: 640px) 78vw, 300px" className="w-[min(78vw,290px)]" />
        ))}
      </Carousel>
    </section>
  );
}
