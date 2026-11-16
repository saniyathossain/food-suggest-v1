// A transparent food cut-out (no background, from the media library) that sits straight on the page's ground, like a dish
// placed on the table: contained (never cropped), a soft contact shadow under it, and an optional slow float. Space is
// reserved by `ratio`, so nothing shifts while it loads. Use it where a food should merge into the page; Photo for photo cards.
import { sized } from '@/components/kit/photo';
import { cn } from '@/lib/utils';

const WIDTHS = [160, 480, 960, 1600];

type Props = {
  src: string;
  alt?: string | undefined;
  /** the rendered width at each breakpoint */
  sizes: string;
  ratio?: string | undefined;
  /** the page's largest paint: load first, no lazy */
  eager?: boolean | undefined;
  float?: boolean | undefined;
  /** inside a `group` card: the dish lifts a touch under the pointer */
  zoom?: boolean | undefined;
  /** the contact shadow under the dish (off for tiny thumbnails) */
  shadow?: boolean | undefined;
  className?: string | undefined;
};

export function Cutout({ src, alt = '', sizes, ratio = '4 / 3', eager = false, float = false, zoom = false, shadow = true, className }: Props) {
  return (
    <div className={cn('relative', className)} style={{ aspectRatio: ratio }}>
      {shadow && <span aria-hidden className="cutout-shadow absolute inset-x-[14%] bottom-[2%] h-[12%] rounded-[50%]" />}
      <img
        className={cn(
          'absolute inset-0 size-full object-contain',
          shadow && 'cutout-image',
          float && 'float-soft',
          zoom && 'transition-transform duration-500 ease-[var(--ease-out)] group-hover:-translate-y-1.5 group-hover:-rotate-2 group-hover:scale-[1.06] motion-reduce:transition-none',
        )}
        src={sized(src, 960)}
        srcSet={WIDTHS.map((width) => `${sized(src, width)} ${width}w`).join(', ')}
        sizes={sizes}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : 'low'}
      />
    </div>
  );
}
