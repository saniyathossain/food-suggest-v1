// A small photo chooser: the current picture (or a drawn tile) as a button; pressing it opens the media library as a grid to pick from,
// with a way to take the photo away. Used where a row owns one picture (a medicine). The library comes from the admin state.
import { Pill } from '@/components/icons/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/lib/i18n';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = { media: MediaItem[]; value: number | null; image: string | null; label: string; onPick: (id: number) => void };

export function MediaPick({ media, value, image, label, onPick }: Props) {
  const { t } = useI18n();
  return (
    <Popover>
      <PopoverTrigger aria-label={label} title={label} className="press grid size-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground transition-colors hover:text-foreground">
        {image ? <img src={`${image}?w=96`} alt="" loading="lazy" className="size-full object-cover" /> : <Pill size={18} />}
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-[min(22rem,calc(100vw-2rem))] gap-2 p-2.5">
        <p className="px-1 text-footnote font-semibold">{label}</p>
        {media.length === 0 ? (
          <p className="px-1 py-3 text-footnote text-muted-foreground">{t.admin.none}</p>
        ) : (
          <ul className="grid max-h-64 grid-cols-4 gap-1.5 overflow-y-auto overscroll-contain" data-lenis-prevent>
            {media.slice(0, 120).map((item) => (
              <li key={item.id}>
                <button type="button" aria-pressed={item.id === value} onClick={() => onPick(item.id)} className={cn('press block aspect-square w-full cursor-pointer overflow-hidden rounded-lg', item.id === value && 'ring-2 ring-primary ring-offset-2 ring-offset-card')}>
                  <img src={`${item.url}?w=96`} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {value !== null && (
          <button type="button" onClick={() => onPick(0)} className="press h-9 rounded-full text-footnote font-semibold text-avoid-ink hover:bg-accent">
            {t.admin.delete}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
