// Admin: the content calendar. Articles and recipes by day: live, scheduled for a day, or a draft. Pick a day and the item
// goes live on it by itself (the catalogue flips it when the day comes); clear the day to keep it a draft.
import { useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { useGet } from '@/components/admin/useOps';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { CalendarClock } from '@/components/icons/page';
import { DatePicker } from '@/components/kit/datepicker';
import { Button } from '@/components/ui/button';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { CalendarItem } from '@/lib/types';

const STATE_TONE: Record<CalendarItem['state'], string> = { published: 'text-ok-ink', scheduled: 'text-limit-ink', draft: 'text-muted-foreground' };

export function ContentCalendar({ admin }: { admin: Admin }) {
  const { t, lang } = useI18n();
  const { data, error, reload } = useGet<CalendarItem[]>('/api/v1/admin/calendar', admin.token);
  const [days, setDays] = useState<Record<string, string>>({});
  const stateLabel = { published: t.admin.ops.live, scheduled: t.admin.ops.scheduled, draft: t.admin.ops.draft } as const;
  const save = async (item: CalendarItem, publishOn: string) => {
    try {
      const base = item.kind === 'post' ? 'posts' : 'recipes';
      await send(`/api/v1/admin/${base}/${item.slug}`, 'PATCH', { published: false, publish_on: publishOn }, admin.token);
      toast(t.admin.saved);
      reload();
    } catch (failure) {
      toast(refusalText(failure));
    }
  };
  const groups = new Map<string, CalendarItem[]>();
  for (const item of data ?? []) {
    const key = item.date ? item.date.slice(0, 7) : t.admin.ops.noDay;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <section className="surface grid gap-5 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={CalendarClock} title={t.admin.ops.sections.calendar} lead={t.admin.ops.leads.calendar} accent="river" className="mb-0" />
      {error && <p role="alert" className="text-footnote text-avoid-ink">{error}</p>}
      {[...groups.entries()].map(([month, items]) => (
        <div key={month} className="grid gap-2">
          <h3 className="text-headline">{month}</h3>
          <ul className="grid gap-2">
            {items.map((item) => (
              <li key={`${item.kind}-${item.slug}`} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
                <span className="rounded-full border px-2 py-0.5 text-caption font-semibold">{item.kind === 'post' ? t.admin.ops.kindPost : t.admin.ops.kindRecipe}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{lang === 'bn' ? item.title_bn || item.title_en : item.title_en}</strong>
                  <span className="text-footnote text-muted-foreground">{item.date ?? t.admin.ops.noDay}</span>
                </span>
                <span className={`text-footnote font-semibold ${STATE_TONE[item.state]}`}>{stateLabel[item.state]}</span>
                {item.state !== 'published' && (
                  <span className="flex flex-wrap items-center gap-2">
                    <DatePicker label={`${item.slug}: ${t.admin.ops.publishOn}`} className="!h-9 !w-48 !text-subhead" value={days[item.slug] ?? (item.state === 'scheduled' ? item.date ?? '' : '')} onChange={(day) => setDays((now) => ({ ...now, [item.slug]: day }))} />
                    <Button size="sm" variant="outline" disabled={!days[item.slug]} onClick={() => void save(item, days[item.slug] ?? '')}>{t.admin.ops.schedule}</Button>
                    {item.state === 'scheduled' && <Button size="sm" variant="ghost" onClick={() => void save(item, '')}>{t.admin.ops.clearSchedule}</Button>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
