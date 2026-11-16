// The media library: drop, browse or paste images (kit Dropzone; each upload shows live progress), import one from a URL, and pick a
// tile as the selected condition's cover (tap again to clear). Delete asks once more on the same button.
import { useState } from 'react';
import { Close, TriangleAlert } from '@/components/icons';
import { Check } from '@/components/icons/page';
import { Trash, Plus } from '@/components/icons/page';
import { Dropzone } from '@/components/kit/dropzone';
import { Photo } from '@/components/kit/photo';
import { ProgressBar } from '@/components/admin/ProgressBar';
import { toast } from '@/components/kit/toast';
import { ActionButton } from '@/components/ui/action-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { usePatchCondition } from './ConditionSettings';
import { UploadIsland } from '@/components/island/UploadIsland';
import { useUploads } from './uploads';
import { refusalText, type Admin, type RawCondition } from './useAdmin';

const ACCEPT = 'image/jpeg,image/png,image/webp';

function Tile({ admin, item, condition }: { admin: Admin; item: MediaItem; condition: RawCondition | undefined }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const patch = usePatchCondition(admin, condition);
  const chosen = condition?.media_id === item.id;
  const remove = () => void send(`/api/v1/admin/media/${item.id}`, 'DELETE', undefined, admin.token).then(admin.saved);
  return (
    <li className="group relative">
      <button type="button" aria-pressed={chosen} title={`${item.source ?? ''} · ${item.license ?? ''}`} onClick={() => void patch({ media_id: chosen ? 0 : item.id })} className={cn('press block w-full cursor-pointer overflow-hidden rounded-lg ring-offset-2 ring-offset-card', chosen && 'ring-3 ring-primary')}>
        <Photo src={item.url} tone={condition?.color} ratio="4 / 3" sizes="180px" zoom />
        <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-caption font-semibold text-white">{t.admin.status[item.status]}</span>
      </button>
      <button type="button" aria-label={confirming ? t.admin.confirmDelete : t.admin.delete} title={confirming ? t.admin.confirmDelete : t.admin.delete} onBlur={() => setConfirming(false)} onClick={() => (confirming ? remove() : setConfirming(true))} className={cn('press absolute right-2 top-2 grid size-8 cursor-pointer place-items-center rounded-full shadow-md transition-opacity', confirming ? 'bg-avoid text-white' : 'bg-card text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-avoid-ink')}>
        <Trash size={15} />
      </button>
    </li>
  );
}

export function MediaLibrary({ admin, condition }: { admin: Admin; condition: RawCondition | undefined }) {
  const { t, num } = useI18n();
  const [url, setUrl] = useState('');
  const uploads = useUploads(admin.token, () => admin.loadMedia(admin.token));
  const importUrl = () =>
    send<MediaItem>('/api/v1/admin/media', 'POST', { url, alt: null }, admin.token)
      .then(() => {
        setUrl('');
        admin.loadMedia(admin.token);
        toast(t.admin.saved);
      })
      .catch((error: unknown) => {
        toast(refusalText(error), 'bad');
        throw error;
      });
  return (
    <section className="surface grid gap-5 rounded-2xl p-5 sm:p-6">
      <div>
        <h2 className="text-title-3">
          {t.admin.media} · {num(admin.media.length)}
        </h2>
        <p className="mt-1 text-subhead text-muted-foreground">{t.admin.mediaLead}</p>
      </div>
      <Dropzone onFiles={uploads.start} accept={ACCEPT} maxBytes={10 * 1024 * 1024} multiple hint={t.admin.dropHint} />
      <UploadIsland items={uploads.items} />
      {uploads.items.length > 0 && (
        <ul className="grid gap-2">
          {uploads.items.map((item) => (
            <li key={item.id} className="well flex items-center gap-3 p-2.5">
              <img src={item.preview} alt="" className="size-11 rounded-md object-cover" />
              <div className="grid min-w-0 flex-1 gap-1.5">
                <span className="truncate text-subhead font-semibold">{item.name}</span>
                {item.state === 'error' ? <small className="text-footnote text-avoid-ink">{item.message}</small> : <ProgressBar value={item.progress} />}
              </div>
              <span className="text-footnote font-semibold tabular-nums">
                {item.state === 'done' && <Check size={18} className="text-recommended-ink" />}
                {item.state === 'error' && <TriangleAlert size={18} className="text-avoid-ink" />}
                {item.state === 'uploading' && `${num(Math.round(item.progress * 100))}%`}
              </span>
              {item.state !== 'uploading' && (
                <button type="button" aria-label={t.kit.dialog.close} onClick={() => uploads.dismiss(item.id)} className="press grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-accent">
                  <Close size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => event.preventDefault()}>
        <div className="grid min-w-[260px] flex-1 gap-2">
          <Label htmlFor="media-url">{t.admin.image}</Label>
          <Input id="media-url" type="url" required placeholder="https://images.pexels.com/photos/…" value={url} onChange={(event) => setUrl(event.target.value)} />
        </div>
        <ActionButton variant="outline" icon={Plus} disabled={!url} onClick={importUrl}>
          {t.admin.import}
        </ActionButton>
      </form>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {admin.media.map((item) => (
          <Tile key={item.id} admin={admin} item={item} condition={condition} />
        ))}
      </ul>
      <small className="text-footnote text-muted-foreground">{t.admin.pickHint}</small>
    </section>
  );
}
