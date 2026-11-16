// One food in a list: its cut-out on a soft tile (else its photo, else its category's icon), its name linking to /food/:slug, and a line under it. Every food mention in
// the app goes through this or FoodChip, so every food is a link.
import type { ReactNode } from 'react';
import { CategoryIcon } from '@/components/icons';
import { Cutout } from '@/components/kit/cutout';
import { Photo } from '@/components/kit/photo';
import { onLink } from '@/lib/router';

type Props = { slug: string; name: string; image: string | null; cutout?: string | null | undefined; category: string; children?: ReactNode };

type ThumbProps = { image: string | null; cutout?: string | null | undefined; name: string; category: string; size?: string };

/** The dish on a soft tile when a cut-out exists, else the cropped photo, else the group icon. */
export function FoodThumb({ image, cutout, name, category, size = 'size-12' }: ThumbProps) {
  if (cutout) {
    return (
      <span className={`${size} grid shrink-0 place-items-center`}>
        <Cutout src={cutout} alt="" ratio="1 / 1" sizes="64px" shadow={false} className="size-full" />
      </span>
    );
  }
  if (image) return <Photo src={image} alt={name} ratio="1 / 1" sizes="56px" className={`${size} shrink-0 rounded-md`} />;
  return (
    <span aria-hidden className={`${size} grid shrink-0 place-items-center rounded-md bg-muted text-muted-foreground`}>
      <CategoryIcon slug={category} size={20} />
    </span>
  );
}

export function FoodRow({ slug, name, image, cutout, category, children }: Props) {
  return (
    <li>
      <a href={`/food/${slug}`} onClick={onLink} className="group -mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent">
        <FoodThumb image={image} cutout={cutout} name={name} category={category} />
        <span className="grid min-w-0 gap-0.5">
          <strong className="text-callout font-semibold transition-colors group-hover:text-primary">{name}</strong>
          {children}
        </span>
      </a>
    </li>
  );
}

/** A food as a small pill link (in sentences, swaps, chip rows). */
export function FoodChip({ slug, name, image, cutout, category }: Omit<Props, 'children'>) {
  return (
    <a href={`/food/${slug}`} onClick={onLink} className="chip press hover:border-primary/40">
      <FoodThumb image={image} cutout={cutout} name={name} category={category} size="size-7 rounded-full" />
      {name}
    </a>
  );
}
