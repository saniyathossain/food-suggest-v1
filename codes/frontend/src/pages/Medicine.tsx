// One medicine: its name and group, how the label says to take it (before, with or after food), the foods and drinks that matter with it,
// the medicines it conflicts with, the brands sold here, other medicines of its group, and the way to add it to a profile. Every note names its
// source. The message is always: ask your doctor or pharmacist, and never stop a medicine on your own.
import { Pill, ExternalLink, Info } from '@/components/icons/page';
import { Crumbs } from '@/components/journey/Crumbs';
import { EmptyState } from '@/components/journey/EmptyState';
import { ErrorBox } from '@/components/kit/loaderror';
import { PageBones } from '@/components/kit/routeskeleton';
import { MedicineCardView } from '@/pages/Medicines';
import { buttonClass } from '@/components/ui/button-styles';
import { LinkedWith } from '@/components/links/LinkedWith';
import { Disclaimer } from '@/components/Sources';
import { useResource } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { Severity } from '@/generated/Severity';
import type { MedicineDetail, Source } from '@/lib/types';
import { cn } from '@/lib/utils';

const TONE: Record<Severity, string> = { serious: 'var(--avoid)', caution: 'var(--limit)' };

function Cite({ source }: { source: Source | null }) {
  if (!source) return null;
  return (
    <p className="text-caption text-muted-foreground">
      {source.url ? (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          {source.publisher}: {source.title} <ExternalLink size={12} />
        </a>
      ) : (
        <span className="font-semibold">{source.publisher}: {source.title}</span>
      )}
    </p>
  );
}

function Note({ severity, title, children }: { severity: Severity; title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <li className="grid gap-2 rounded-2xl border bg-card p-4" style={{ borderColor: `color-mix(in srgb, ${TONE[severity]} 38%, transparent)` }}>
      <p className="flex flex-wrap items-center gap-2 text-subhead font-bold">
        <span className="rounded-full px-2.5 py-0.5 text-caption font-bold" style={{ background: `color-mix(in srgb, ${TONE[severity]} 16%, var(--card))`, color: `color-mix(in srgb, ${TONE[severity]} 75%, var(--foreground))` }}>
          {t.meds.severity[severity]}
        </span>
        {title}
      </p>
      {children}
    </li>
  );
}

export default function Medicine({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const auth = useAuth();
  const { data, error } = useResource<MedicineDetail>(`/api/v1/library/medicines/${encodeURIComponent(slug)}?lang=${lang}`);
  if (error) return <main className="page"><ErrorBox message={error.status === 404 ? t.library.missing : error.message} /></main>;
  if (!data) return <PageBones shape="plan" />;
  const { generic } = data;
  return (
    <main className="page grid gap-8">
      <Crumbs trail={[{ href: '/medicines', label: t.library.title }]} here={generic.name} />
      <header className="surface grid gap-4 rounded-[30px] p-5 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
        {data.image ? <img src={`${data.image}?w=192`} alt="" className="size-16 rounded-3xl object-cover" /> : <span className="tile size-16 rounded-3xl [--tone:var(--river)]"><Pill size={30} /></span>}
        <div className="grid gap-1.5">
          <h1 className="text-[clamp(30px,4vw,44px)] leading-[1.05]">{generic.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-subhead text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1 font-semibold text-foreground">{generic.group}</span>
            <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">{t.meds.foodOptions[generic.food_timing]}</span>
          </p>
        </div>
        <a href={auth.status === 'in' ? `/account?medicine=${encodeURIComponent(generic.slug)}` : '/register'} onClick={onLink} className={buttonClass('default', 'lg')}>
          {auth.status === 'in' ? t.library.addToProfile : t.library.signUp}
        </a>
      </header>
      {generic.how_to_take && (
        <section className="surface-soft grid gap-1.5 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-callout font-bold not-italic [font-family:var(--font-sans)]"><Info size={17} /> {t.meds.label}</h2>
          <p className="text-subhead">{generic.how_to_take}</p>
          <Cite source={generic.source} />
        </section>
      )}
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section aria-labelledby="food-notes" className="grid gap-3">
          <h2 id="food-notes" className="text-title-3 font-bold not-italic [font-family:var(--font-sans)]">{t.library.foodTitle}</h2>
          {data.foods.length === 0 && <p className="text-subhead text-muted-foreground">{t.library.noFood}</p>}
          <ul className="grid gap-3">
            {data.foods.map((row) => (
              <Note key={`${row.item}-${row.advice}`} severity={row.severity} title={row.item}>
                <p className="text-subhead text-muted-foreground">{row.advice}</p>
                {row.foods.length > 0 && (
                  <p className="flex flex-wrap gap-1.5">
                    {row.foods.map(([foodSlug, name]) => (
                      <a key={foodSlug} href={`/food/${foodSlug}`} onClick={onLink} className="chip press !min-h-0 !px-3 !py-1 text-footnote">{name}</a>
                    ))}
                  </p>
                )}
                <Cite source={row.source} />
              </Note>
            ))}
          </ul>
        </section>
        <section aria-labelledby="drug-notes" className="grid gap-3">
          <h2 id="drug-notes" className="text-title-3 font-bold not-italic [font-family:var(--font-sans)]">{t.library.drugTitle}</h2>
          {data.drugs.length === 0 && <p className="text-subhead text-muted-foreground">{t.library.noDrugs}</p>}
          <ul className="grid gap-3">
            {data.drugs.map((row) => (
              <Note key={`${row.first}-${row.second}`} severity={row.severity} title={`${row.first} + ${row.second}`}>
                <p className="text-subhead text-muted-foreground">{row.reason}</p>
                <Cite source={row.source} />
              </Note>
            ))}
          </ul>
        </section>
      </div>
      <section aria-labelledby="brands" className="grid gap-3">
        <h2 id="brands" className="text-title-3 font-bold not-italic [font-family:var(--font-sans)]">{t.library.brands}</h2>
        {data.brands.length === 0 ? (
          <EmptyState icon={Pill} title={t.library.noBrands} lead={t.library.noBrandsLead} />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.brands.map((brand) => (
              <li key={brand.id} className="grid gap-0.5 rounded-xl border bg-card px-4 py-3">
                <strong className="text-subhead">{brand.brand} {brand.strength && <span className="font-normal text-muted-foreground">· {brand.strength}</span>}</strong>
                <span className="text-footnote text-muted-foreground">{brand.company} · {brand.form}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {data.related.length > 0 && (
        <section aria-labelledby="related" className="grid gap-3">
          <h2 id="related" className={cn('text-title-3 font-bold not-italic [font-family:var(--font-sans)]')}>{t.library.related}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.related.map((item) => (
              <MedicineCardView key={item.slug} item={item} />
            ))}
          </div>
        </section>
      )}
      <LinkedWith from={`medicine:${generic.slug}`} />
      <Disclaimer />
    </main>
  );
}
