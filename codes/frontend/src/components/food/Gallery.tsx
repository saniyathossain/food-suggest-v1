// A food's pictures: the one in view large (a cut-out sits straight on the page, a photo gets a rounded frame), and a strip
// of thumbnails when there are two or more. Choosing a way of cooking on the page (an omelette, a poached egg) brings its
// picture into view when the gallery has one. No pictures at all: the food group's icon.
import { useEffect, useState } from 'react';
import { Artwork } from '@/components/kit/artwork';
import { Cutout } from '@/components/kit/cutout';
import { Photo } from '@/components/kit/photo';
import type { FoodPhoto } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = { photos: FoodPhoto[]; name: string; category: string; variant: string };

export function Gallery({ photos, name, category, variant }: Props) {
  // a cut-out leads when there is one: it reads best on the page
  const ordered = [...photos].sort((first, second) => Number(second.transparent) - Number(first.transparent));
  const [shown, setShown] = useState(ordered[0]?.url ?? '');
  useEffect(() => {
    const match = ordered.find((photo) => photo.variant === variant);
    if (match) setShown(match.url);
    // only a new choice of variant moves the gallery; the list itself is stable per food
  }, [variant]);
  const current = ordered.find((photo) => photo.url === shown) ?? ordered[0];
  if (!current) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-2xl shadow-md" style={{ containerType: 'inline-size' }}>
        <Artwork category={category} name={name} />
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <div key={current.url} className="anim-fade">
        {current.transparent ? (
          <Cutout src={current.url} alt={name} eager ratio="1 / 1" sizes="(max-width: 768px) 100vw, 420px" className="max-md:max-h-[320px]" />
        ) : (
          <Photo src={current.url} alt={name} eager ratio="1 / 1" sizes="(max-width: 768px) 100vw, 420px" className="rounded-2xl shadow-md" />
        )}
      </div>
      {ordered.length > 1 && (
        <div className="rail gap-2 pb-1" role="group" aria-label={name}>
          {ordered.map((photo, index) => (
            <button
              key={photo.url}
              type="button"
              aria-pressed={photo.url === current.url}
              aria-label={`${name} ${index + 1}`}
              onClick={() => setShown(photo.url)}
              className={cn(
                'press size-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 bg-card transition-colors',
                photo.url === current.url ? 'border-primary' : 'border-transparent hover:border-border',
              )}
            >
              {photo.transparent ? (
                <Cutout src={photo.url} alt="" ratio="1 / 1" sizes="64px" shadow={false} className="size-full p-1" />
              ) : (
                <Photo src={photo.url} alt="" ratio="1 / 1" sizes="64px" className="size-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
