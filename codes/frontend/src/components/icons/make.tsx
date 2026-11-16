// The two ways Pathya draws a still icon (Shell Console's helpers): a Hugeicons glyph, or an Iconly glyph in its softer line. Same
// props, same hover motion (app-icon), so a call site never knows which set drew it.
import { forwardRef, type ComponentType, type SVGProps } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & { size?: number | string; strokeWidth?: number };

/** An icon component: what every `icon` prop and icon map in the app takes. */
export type AppIcon = ComponentType<IconProps>;

/** Pathya's stroke: FlavorFit's thin line (1.5) at 15–20 px, one weight for every glyph. */
export const STROKE = 1.5;

export function icon(data: IconSvgElement, name: string): AppIcon {
  const Glyph = forwardRef<SVGSVGElement, IconProps>(({ strokeWidth = STROKE, size = 24, className, ...rest }, ref) => (
    <HugeiconsIcon ref={ref} icon={data} size={size} strokeWidth={strokeWidth} className={className ? `app-icon ${className}` : 'app-icon'} aria-hidden {...rest} />
  ));
  Glyph.displayName = name;
  return Glyph;
}
