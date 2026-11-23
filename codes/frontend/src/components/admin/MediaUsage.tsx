// Admin: media usage. How many pictures the library holds, which the catalogue uses and which it does not, the space they take,
// and the unused ones (newest first) so they can be deleted from the library.
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { useGet } from '@/components/admin/useOps';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { HardDrive, Trash } from '@/components/icons/page';
import { IconButton } from '@/components/ui/icon-button';
import { send } from '@/lib/api';
import { confirmDialog } from '@/lib/confirm';
import { useI18n } from '@/lib/i18n';
import type { MediaUsage as Usage } from '@/lib/types';

const megabytes = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;

export function MediaUsage({ admin }: { admin: Admin }) {
  const { t, num } = useI18n();
  const { data, error, reload } = useGet<Usage>('/api/v1/admin/media/usage', admin.token);
  const remove = async (id: number) => {
    if (!(await confirmDialog({ title: t.admin.deleteMediaTitle, body: t.admin.deleteMedia, tone: 'danger' }))) return;
    try {
      await send(`/api/v1/admin/media/${id}`, 'DELETE', undefined, admin.token);
      toast(t.admin.saved);
      reload();
      admin.loadMedia(admin.token);
    } catch (failure) {
      toast(refusalText(failure));
    }
  };
  return (
    <section className="surface grid gap-5 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={HardDrive} title={t.admin.ops.sections.media} lead={t.admin.ops.leads.media} accent="aubergine" className="mb-0" />
      {error && <p role="alert" className="text-footnote text-avoid-ink">{error}</p>}
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t.admin.ops.mediaTotal, num(data.total)],
              [t.admin.ops.mediaUsed, num(data.used)],
              [t.admin.ops.mediaUnused, num(data.unused)],
              [t.admin.ops.mediaSpace, `${megabytes(data.bytes)} (${megabytes(data.unused_bytes)} ${t.admin.ops.mediaUnused.toLowerCase()})`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-card p-3"><dt className="text-caption text-muted-foreground">{label}</dt><dd className="text-title-3">{value}</dd></div>
            ))}
          </dl>
          <p className="flex flex-wrap gap-2 text-footnote"><strong>{t.admin.ops.mediaBySource}:</strong>{data.by_source.map((row) => <span key={row.source} className="rounded-full border px-2.5 py-1">{row.source}: {num(row.items)} · {megabytes(row.bytes)}</span>)}</p>
          {data.unused_items.length > 0 && (
            <div className="grid gap-2">
              <h3 className="text-headline">{t.admin.ops.mediaUnusedList}</h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {data.unused_items.map((item) => (
                  <li key={item.id} className="relative overflow-hidden rounded-xl border bg-card">
                    <img src={item.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                    <span className="flex items-center justify-between gap-2 p-2 text-caption text-muted-foreground"><span>#{item.id} · {megabytes(Number(item.bytes))}</span><IconButton icon={Trash} label={t.admin.delete} tone="danger" onClick={() => void remove(item.id)} /></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
