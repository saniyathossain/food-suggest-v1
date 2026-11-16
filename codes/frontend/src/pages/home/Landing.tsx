// Today for a visitor who is not signed in: the public front page. The hero (the next meal; its photo is preloaded by the server),
// how Pathya works in three steps, the plan builder to try without an account, recipes with videos, then the shared reading below
// (season, conditions, food of the day, swaps, tip) and a band that invites them to keep it all with a free account.
import { lazy, Suspense } from 'react';
import { ArrowRight } from '@/components/icons/page';
import { Sparkles } from '@/components/icons';
import { Hero } from './Hero';
import { buttonClass } from '@/components/ui/button-styles';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { Bootstrap } from '@/lib/types';

const Builder = lazy(() => import('./Builder'));
const HomeMore = lazy(() => import('./More'));
const RecipeShelf = lazy(() => import('./RecipeShelf'));
const LandingMore = lazy(() => import('./LandingMore'));

function How() {
  const { t, num } = useI18n();
  const steps = t.landing.steps.split(';').map((step) => step.split('|') as [string, string]);
  return (
    <section aria-labelledby="how-title" className="grid gap-8">
      <h2 id="how-title" className="text-[clamp(28px,3vw,40px)]">{t.landing.howTitle}</h2>
      <ol className="grid gap-6 md:grid-cols-3 xl:gap-8">
        {steps.map(([title, detail], index) => (
          <li key={title} className="surface grid content-start gap-4 rounded-[30px] p-7 sm:p-8">
            <span className="grid size-11 place-items-center rounded-full bg-cta text-callout font-extrabold text-cta-ink">{num(index + 1)}</span>
            <h3 className="text-title-3">{title}</h3>
            <p className="text-subhead text-muted-foreground">{detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Invite() {
  const { t } = useI18n();
  return (
    <section className="promo grid gap-5 p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="grid max-w-2xl gap-2">
        <h2 className="text-[clamp(26px,3vw,38px)] leading-[1.05] text-white">{t.landing.ctaTitle}</h2>
        <p className="text-callout text-white/85">{t.landing.ctaLead}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a href="/register" onClick={onLink} className={buttonClass('default', 'lg')}>
          <Sparkles size={18} /> {t.landing.ctaSignUp}
        </a>
        <a href="/login" onClick={onLink} className="press inline-flex h-12 items-center gap-2 rounded-full border border-white/70 px-6 text-callout font-semibold text-white transition-colors hover:bg-white/10">
          {t.landing.ctaSignIn} <ArrowRight size={17} />
        </a>
      </div>
    </section>
  );
}

export function Landing({ boot }: { boot: Bootstrap }) {
  return (
    <div className="grid gap-24">
      <Hero boot={boot} />
      <How />
      <Suspense fallback={<span className="shimmer block h-[380px] rounded-[28px]" />}>
        <Builder boot={boot} />
      </Suspense>
      <Suspense fallback={null}>
        <RecipeShelf />
      </Suspense>
      <Suspense fallback={null}>
        <HomeMore boot={boot} />
      </Suspense>
      <Suspense fallback={null}>
        <LandingMore boot={boot} />
      </Suspense>
      <Invite />
    </div>
  );
}
