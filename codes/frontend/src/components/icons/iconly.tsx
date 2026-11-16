// Iconly glyphs (Iconly 2 Essential, MIT, its light line) drawn like every other icon. Only lazy pages use them, so the glyph data
// (iconly.generated.ts) stays out of the first bundle.
import { createElement, forwardRef, type ReactNode } from 'react';
import { ICONLY, type IconlyNode } from '@/components/icons/iconly.generated';
import { STROKE, type AppIcon, type IconProps } from '@/components/icons/make';

/** Iconly draws its line at 1.5 on 24: matched to the stroke so the two sets sit together. */
const ICONLY_LINE = 1.5 / 1.75;

function drawn(nodes: readonly IconlyNode[]): ReactNode[] {
  return nodes.map(([tag, attrs, children], index) => createElement(tag, { key: index, ...attrs }, ...drawn(children)));
}

export function iconly(name: keyof typeof ICONLY, label: string): AppIcon {
  const shapes = drawn(ICONLY[name] as IconlyNode[]);
  const Glyph = forwardRef<SVGSVGElement, IconProps>(({ strokeWidth = STROKE, size = 24, className, ...rest }, ref) => (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" strokeWidth={Number(strokeWidth) * ICONLY_LINE} className={className ? `app-icon ${className}` : 'app-icon'} aria-hidden {...rest}>
      {shapes}
    </svg>
  ));
  Glyph.displayName = label;
  return Glyph;
}
