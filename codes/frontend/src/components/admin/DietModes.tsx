// Admin: diet modes (everyday, Ramadan, 16:8…). Filter by kind and status, switch a mode on or off for the whole site; the plan
// and the mode picker follow at once. Counts show how much each mode holds (meals, tips, condition notes).
import { useEffect, useMemo, useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { toast } from '@/components/kit/toast';
import { SectionTitle } from '@/components/kit/section';
import { Clock } from '@/components/icons/page';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { DietModeAdmin, DietModeKind } from '@/lib/types';

type KindFilter = 'all' | DietModeKind;
type StatusFilter = 'all' | 'on' | 'off';

export function DietModes({ admin }: { admin: Admin }) {
  const { t, lang, num } = useI18n();
  const [rows, setRows] = useState<DietModeAdmin[]>([]);
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const load = () => void send<DietModeAdmin[]>('/api/v1/admin/modes', 'GET', undefined, admin.token).then(setRows).catch(() => undefined);
  useEffect(load, [admin.token]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(
    () => rows.filter((row) => (kind === 'all' || row.kind === kind) && (status === 'all' || (status === 'on') === row.active)),
    [rows, kind, status],
  );
  const toggle = async (row: DietModeAdmin, active: boolean) => {
    setRows((current) => current.map((item) => (item.slug === row.slug ? { ...item, active } : item)));
    try {
      await send('/api/v1/admin/modes/' + row.slug, 'PATCH', { active }, admin.token);
      admin.saved();
    } catch (error) {
      toast(refusalText(error));
      load();
    }
  };
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={Clock} title={t.admin.modes} lead={t.admin.modesLead} accent="aubergine" className="mb-0" />
      <div className="flex flex-wrap gap-3">
        <Segmented
          label={t.admin.kind}
          value={kind}
          onChange={(value) => setKind(value as KindFilter)}
          options={[
            { value: 'all', label: t.admin.all },
            { value: 'general', label: t.admin.kinds.general },
            { value: 'religious_fast', label: t.admin.kinds.religious_fast },
            { value: 'time_restricted', label: t.admin.kinds.time_restricted },
          ]}
        />
        <Segmented
          label={t.admin.modeStatus}
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
          options={[
            { value: 'all', label: t.admin.all },
            { value: 'on', label: t.admin.on },
            { value: 'off', label: t.admin.off },
          ]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[560px] text-left text-subhead">
          <thead className="text-footnote text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-semibold">{t.admin.mode}</th>
              <th className="py-2 pr-3 font-semibold">{t.admin.kind}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t.admin.counts}</th>
              <th className="py-2 text-right font-semibold">{t.admin.modeStatus}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.slug} className="border-b last:border-0">
                <td className="py-3 pr-3">
                  <strong>{lang === 'bn' ? row.name_bn || row.name_en : row.name_en}</strong>
                  <span className="block text-footnote text-muted-foreground">{row.slug}</span>
                </td>
                <td className="py-3 pr-3 text-muted-foreground">{t.admin.kinds[row.kind]}</td>
                <td className="py-3 pr-3 text-right tabular-nums text-muted-foreground">
                  {num(row.slots)} · {num(row.tips)} · {num(row.conditions)}
                </td>
                <td className="py-3 text-right">
                  <Switch checked={row.active} onCheckedChange={(on) => void toggle(row, on)} aria-label={`${row.name_en}: ${row.active ? t.admin.on : t.admin.off}`} />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">
                  {t.admin.none}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
