// What stands in for a picture that is missing or failed to load: not a grey box but a small piece of artwork in the page's own glass
// language: a tinted wash that takes the food group's colour, a lit glass bead with the group's icon, and a soft ghost of the
// name's first letter behind it. Paint only (gradients and shadows), so a page of missing pictures costs nothing.
import { CategoryIcon } from '@/components/icons';
import { Sparkles } from '@/components/icons';
import { cn } from '@/lib/utils';

/** Each food group's own tone (CSS colour variables from styles/tokens.css). */
const TONES: Record<string, string> = {
  grains: 'var(--saffron)',
  proteins: 'var(--coral)',
  lentils: 'var(--mango)',
  vegetables: 'var(--leaf)',
  fruits: 'var(--coral)',
  dairy: 'var(--tone-sky)',
  snacks: 'var(--mango)',
  sweets: 'var(--tone-rose)',
  drinks: 'var(--river)',
  kitchen: 'var(--saffron)',
  processed: 'var(--muted-foreground)',
  baby: 'var(--tone-rose)',
  functional: 'var(--aubergine)',
};

export const groupTone = (category: string | undefined): string => TONES[category ?? ''] ?? 'var(--primary)';

type Props = { category?: string | undefined; name?: string | undefined; className?: string | undefined; small?: boolean };

export function Artwork({ category, name, className, small = false }: Props) {
  const initial = (name ?? '').trim().charAt(0).toUpperCase();
  return (
    <span aria-hidden className={cn('art', small && 'art-small', className)} style={{ ['--tone' as string]: groupTone(category) }}>
      {initial && !small && <span className="art-mark">{initial}</span>}
      <span className="art-orb">{category ? <CategoryIcon slug={category} size={small ? 18 : 30} /> : <Sparkles size={small ? 18 : 30} />}</span>
    </span>
  );
}
