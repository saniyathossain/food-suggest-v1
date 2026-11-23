// The builder's live side: while you choose, this panel shows who the plan is for, the conditions picked and how many foods those
// conditions mark to eat more of, fine, go easy on or avoid (summed over the picked conditions, so a food two conditions mark counts
// twice). It fills the width the form leaves free and says what is missing instead of staying blank.
import { Icon } from '@/components/icons';
import { VerdictMeter, verdictColor, VERDICTS } from '@/components/Verdict';
import { useI18n } from '@/lib/i18n';
import type { Bootstrap, Profile, Verdict } from '@/lib/types';
import { tone } from '@/lib/utils';

export function BuilderPreview({ boot, draft }: { boot: Bootstrap; draft: Profile }) {
  const { t, num } = useI18n();
  const chosen = boot.conditions.filter((condition) => draft.conditions.includes(condition.slug));
  const counts: Record<Verdict, number> = { avoid: 0, limit: 0, ok: 0, recommended: 0 };
  chosen.forEach((condition) => VERDICTS.forEach((verdict) => (counts[verdict] += condition.counts[verdict])));
  const country = boot.countries.find((item) => item.code === draft.country)?.name ?? draft.country;
  return (
    <aside aria-label={t.profile.live} className="grid content-start gap-5 rounded-2xl border bg-[color-mix(in_srgb,var(--primary)_5%,var(--card))] p-5 sm:p-6">
      <div className="grid gap-1">
        <p className="eyebrow">{t.profile.live}</p>
        <p className="text-title-3 font-bold">
          {t.gender[draft.gender]} · {num(draft.age)} {t.profile.years} · {country}
        </p>
      </div>
      {chosen.length === 0 ? (
        <p className="text-subhead text-muted-foreground">{t.profile.liveEmpty}</p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-1.5">
            {chosen.map((condition) => (
              <li key={condition.slug} className="tone-soft inline-flex items-center gap-1.5 rounded-full py-1 pe-3 ps-1.5 text-footnote font-semibold" style={tone(condition.color)}>
                <span className="tile size-6 rounded-full">
                  <Icon name={condition.icon} size={13} />
                </span>
                {condition.name}
              </li>
            ))}
          </ul>
          <div className="grid gap-3">
            <VerdictMeter counts={counts} className="h-2.5" />
            <dl className="grid grid-cols-2 gap-2.5">
              {VERDICTS.slice().reverse().map((verdict) => (
                <div key={verdict} className="flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5 shadow-[var(--sh-xs)]">
                  <i className="dot" style={{ background: verdictColor[verdict] }} />
                  <dt className="min-w-0 flex-1 truncate text-footnote text-muted-foreground">{t.verdict[verdict]}</dt>
                  <dd className="text-title-3 font-extrabold tabular-nums">{num(counts[verdict])}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}
    </aside>
  );
}
