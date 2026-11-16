// Today's opening, split: the headline, lead and two ways in (build a plan, look a food up) on a white panel (FlavorFit), and the next
// meal as a transparent cut-out sitting straight on the band (no photo box), floating gently, with its countdown pill under it.
// Without a cut-out it falls back to the photo. Phones see the food first. It is the LCP image: eager, fetchPriority high.
import { Search, Sparkles } from '@/components/icons';
import { Cutout } from '@/components/kit/cutout';
import { Photo } from '@/components/kit/photo';
import { NextMeal, useNextSlot } from '@/components/NextMeal';
import { buttonClass } from '@/components/ui/button-styles';
import { useI18n } from '@/lib/i18n';
import type { Bootstrap } from '@/lib/types';

export function Hero({ boot }: { boot: Bootstrap }) {
  const { t } = useI18n();
  const { next } = useNextSlot(boot);
  return (
    <section aria-labelledby="hero-title" className="surface rounded-[32px]">
      <div className="grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10 lg:p-10">
        <div className="order-2 grid gap-5 lg:order-1">
          <h1 id="hero-title" className="page-in whitespace-pre-line text-display font-extrabold tracking-[-0.035em]">
            {t.home.title}
          </h1>
          <p className="max-w-[52ch] text-callout text-muted-foreground sm:text-body">{t.home.lead}</p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#builder" className={buttonClass('default', 'lg')}>
              <Sparkles size={20} /> {t.home.build}
            </a>
            <button type="button" className={buttonClass('outline', 'lg')} onClick={() => window.dispatchEvent(new Event('spotlight:open'))}>
              <Search size={20} /> {t.home.lookUp}
            </button>
          </div>
        </div>
        <figure className="relative order-1 m-0 grid gap-3 lg:order-2">
          {next?.cutout ? (
            <Cutout src={next.cutout} alt={next.name} eager float ratio="4 / 3" sizes="(max-width: 640px) 270px, (max-width: 1024px) calc(100vw - 64px), 600px" className="mx-auto w-full max-w-[560px] max-lg:max-h-[300px]" />
          ) : (
            <Photo src={next?.image} alt={next?.name ?? ''} tone="#16a34a" eager ratio="4 / 3" sizes="(max-width: 640px) 270px, (max-width: 1024px) calc(100vw - 64px), 600px" className="w-full rounded-3xl" />
          )}
          <figcaption className="mx-auto w-full max-w-[460px]">
            <NextMeal boot={boot} />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
