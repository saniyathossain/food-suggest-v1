// Images come from the media library (`/media/{id}`, stored in S3/MinIO, WebP variants 32–1600 px). A lazy photo with a calm reveal:
//   1. a tinted gradient (instant, zero bytes) → 2. a 32 px blurred preview (~1 KB) once near the viewport
//   → 3. the responsive WebP fades and sharpens in on decode (styles/motion.css, .photo-*). Off-screen photos cost nothing.
// An `eager` photo is the page's largest paint: it shows as soon as it decodes, with no preview and no fade (a fade delays LCP).
// Inside a `group` (a card that links somewhere) the picture zooms to 1.04 under the pointer.
import { useEffect, useRef, useState } from 'react';
import { Artwork } from '@/components/kit/artwork';
import { cn, tone as toneStyle } from '@/lib/utils';

// the widths the media library stores (services/media.rs WIDTHS); asking for another width gets the next one up
const WIDTHS = [160, 480, 960, 1600];

/** Pexels/Unsplash-style CDNs resize on the fly; other URLs are used as they are. */
export function sized(url: string, width: number): string {
  const bare = url.split('?')[0] ?? url;
  if (url.startsWith('/media/')) return `${bare}?w=${width}`;
  if (url.startsWith('https://images.pexels.com/')) return `${bare}?auto=compress&cs=tinysrgb&fm=webp&w=${width}`;
  if (url.startsWith('https://images.unsplash.com/')) return `${bare}?auto=format&fit=crop&q=70&w=${width}`;
  return url;
}

function useNearViewport<Node extends HTMLElement>(margin = '240px') {
  const ref = useRef<Node>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || near) return;
    if (!('IntersectionObserver' in window)) {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: margin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near, margin]);
  return { ref, near };
}

type Props = {
  src: string | null | undefined;
  alt?: string | undefined;
  tone?: string | undefined;
  /** the rendered width at each breakpoint, so a phone downloads the 360–640 variant */
  sizes: string;
  /** a CSS aspect ratio; 'auto' when the parent sets the height */
  ratio?: string | undefined;
  eager?: boolean | undefined;
  zoom?: boolean | undefined;
  /** the food group (or nothing) the artwork stands in with when there is no picture */
  category?: string | undefined;
  className?: string | undefined;
};

export function Photo({ src, alt = '', tone = '#16a34a', sizes, ratio = '16 / 9', eager = false, zoom = false, category, className }: Props) {
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const show = Boolean(src) && !failed && (near || eager);
  return (
    <div
      ref={ref}
      className={cn('photo-frame relative overflow-hidden bg-[linear-gradient(150deg,color-mix(in_srgb,var(--tone)_30%,var(--card)),color-mix(in_srgb,var(--tone)_12%,var(--muted)))]', className)}
      style={{ ...toneStyle(tone), aspectRatio: ratio }}
      aria-hidden={alt === '' ? true : undefined}
    >
      {(!src || failed) && <Artwork category={category} name={alt} />}
      {show && src && (
        <span
          className={cn('absolute inset-0 block', zoom && 'transition-[scale] duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04] motion-reduce:transition-none')}
          data-loaded={loaded || eager || undefined}
        >
          {!eager && <span className="photo-preview" style={{ backgroundImage: `url("${sized(src, 32)}")` }} />}
          <img
            className="photo-image absolute inset-0 size-full object-cover"
            src={sized(src, 960)}
            srcSet={WIDTHS.map((width) => `${sized(src, width)} ${width}w`).join(', ')}
            sizes={sizes}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={eager ? 'high' : 'low'}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </span>
      )}
    </div>
  );
}
