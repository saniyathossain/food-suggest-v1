// Admin: review and coverage. For every condition: its rules by verdict, the foods it has no rule for, rules that cite
// nothing or wait for review, and whether it may go live. A medical reviewer marks a condition (and its rules) reviewed; a
// condition ships only after that.
import { useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { useGet } from '@/components/admin/useOps';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { ListChecks, ShieldKey } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Coverage as CoverageReport, CoverageRow } from '@/lib/types';

function Chip({ tone, children }: { tone: 'ok' | 'warn' | 'bad'; children: string }) {
  const color = tone === 'ok' ? 'text-ok-ink' : tone === 'warn' ? 'text-limit-ink' : 'text-avoid-ink';
  return <span className={`rounded-full border px-2 py-0.5 text-caption font-semibold ${color}`}>{children}</span>;
}

export function Coverage({ admin }: { admin: Admin }) {
  const { t, lang, num } = useI18n();
  const { data, error, reload } = useGet<CoverageReport>('/api/v1/admin/coverage', admin.token);
  const [busy, setBusy] = useState('');
  const act = async (row: CoverageRow, what: 'review' | 'live') => {
    setBusy(`${what}:${row.slug}`);
    try {
      if (what === 'review') await send(`/api/v1/admin/conditions/${row.slug}/review`, 'POST', undefined, admin.token);
      else await send(`/api/v1/admin/conditions/${row.slug}`, 'PATCH', { active: true }, admin.token);
      toast(what === 'review' ? t.admin.ops.reviewed : t.admin.saved);
      reload();
      admin.saved();
    } catch (failure) {
      toast(refusalText(failure));
    } finally {
      setBusy('');
    }
  };
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={ListChecks} title={t.admin.ops.sections.coverage} lead={t.admin.ops.leads.coverage} accent="leaf" className="mb-0" />
      {error && <p role="alert" className="text-footnote text-avoid-ink">{error}</p>}
      {data && <p className="text-footnote text-muted-foreground">{t.admin.ops.coverageFoods}: {num(data.foods)}</p>}
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[820px] text-left text-subhead">
          <thead>
            <tr className="border-b text-footnote text-muted-foreground">
              <th className="py-2 pr-3">{t.nav.conditions}</th>
              <th className="py-2 pr-3">{t.admin.ops.rules}</th>
              <th className="py-2 pr-3">{t.admin.ops.noRule}</th>
              <th className="py-2 pr-3">{t.admin.ops.uncited}</th>
              <th className="py-2 pr-3">{t.admin.ops.unreviewed}</th>
              <th className="py-2 pr-3">{t.admin.ops.reviewedOn}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.conditions.map((row) => (
              <tr key={row.slug} className="border-b align-top last:border-0">
                <td className="py-3 pr-3">
                  <strong>{lang === 'bn' ? row.name_bn || row.name_en : row.name_en}</strong>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Chip tone={row.active ? 'ok' : 'warn'}>{row.active ? t.admin.ops.live : t.admin.ops.draft}</Chip>
                    <span className="text-footnote text-muted-foreground">{t.admin.ops.timing} {num(row.timing)} · {t.admin.ops.habits} {num(row.habits)} · {t.admin.ops.sources} {num(row.sources)}</span>
                  </span>
                </td>
                <td className="py-3 pr-3">{num(row.rules)}<span className="block text-footnote text-muted-foreground">{num(row.avoid)} / {num(row.limit)} / {num(row.ok)} / {num(row.recommended)}</span></td>
                <td className="py-3 pr-3">
                  {num(row.uncovered)}
                  {row.uncovered_sample.length > 0 && (
                    <details className="mt-1 text-footnote text-muted-foreground">
                      <summary className="cursor-pointer">{t.admin.ops.sample}</summary>
                      <span className="block max-w-[28ch] break-words">{row.uncovered_sample.join(', ')}</span>
                    </details>
                  )}
                </td>
                <td className="py-3 pr-3">{row.uncited > 0 ? <Chip tone="bad">{num(row.uncited)}</Chip> : '0'}</td>
                <td className="py-3 pr-3">{row.unreviewed > 0 ? <Chip tone="warn">{num(row.unreviewed)}</Chip> : '0'}</td>
                <td className="py-3 pr-3">{row.reviewed_on ?? <span className="text-muted-foreground">{t.admin.ops.neverReviewed}</span>}</td>
                <td className="py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {(row.unreviewed > 0 || !row.reviewed_on) && (
                      <Button size="sm" variant="outline" icon={ShieldKey} title={t.admin.ops.reviewHint} state={busy === `review:${row.slug}` ? 'busy' : 'idle'} disabled={row.uncited > 0} onClick={() => void act(row, 'review')}>
                        {t.admin.ops.review}
                      </Button>
                    )}
                    {!row.active && (
                      <Button size="sm" state={busy === `live:${row.slug}` ? 'busy' : 'idle'} disabled={!row.can_ship} title={row.blocker ?? t.admin.ops.ready} onClick={() => void act(row, 'live')}>
                        {t.admin.ops.publish}
                      </Button>
                    )}
                  </div>
                  {row.blocker && !row.active && <p className="mt-1 max-w-[30ch] text-right text-caption text-muted-foreground">{row.blocker}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
