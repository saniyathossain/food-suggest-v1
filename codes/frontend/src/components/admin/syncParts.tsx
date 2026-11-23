// Small shared pieces of the external-sync admin: the status badge and the time a run is shown with.
import { useI18n } from '@/lib/i18n';
import type { SyncStatus } from '@/lib/types';

const TONE: Record<SyncStatus, string> = {
  running: 'bg-warning-soft text-limit-ink',
  ok: 'bg-success-soft text-recommended-ink',
  failed: 'bg-danger-soft text-avoid-ink',
};

export function StatusBadge({ status }: { status: SyncStatus | null }) {
  const { t } = useI18n();
  if (!status) return <span className="text-footnote text-muted-foreground">{t.admin.syncSources.never}</span>;
  return <span className={`rounded-full px-2.5 py-0.5 text-caption font-bold ${TONE[status]}`}>{t.admin.syncSources.status[status]}</span>;
}

/** Unix seconds as the reader's local date and time. */
export function useWhen(): (seconds: number | null | undefined) => string {
  const { lang } = useI18n();
  return (seconds) => (seconds ? new Date(Number(seconds) * 1000).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
}
