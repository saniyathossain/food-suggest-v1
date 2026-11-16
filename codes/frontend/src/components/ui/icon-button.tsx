// A button that is only an icon (Shell Console's IconButton). Its label is required: it becomes the accessible name and the native
// tooltip. Pathya draws the label with `title` rather than Radix Tooltip, so the top bar (first paint) carries no Radix code; a lazy
// page that wants the rich tooltip wraps it in <Tip>.
import * as React from 'react';
import type { AppIcon } from '@/components/icons';
import { Swap } from '@/components/ui/swap';
import { ICON_SIZE as SIZE, ICON_TONE as TONE, iconButtonClass } from '@/components/ui/button-styles';

export { iconButtonClass };


type Props = Omit<React.ComponentProps<'button'>, 'children' | 'aria-label'> & {
  icon: AppIcon;
  label: string;
  size?: keyof typeof SIZE | undefined;
  tone?: keyof typeof TONE | undefined;
  pressed?: boolean | undefined;
};

export function IconButton({ icon, label, size = 'sm', tone = 'ghost', pressed, className, type = 'button', ...props }: Props) {
  return (
    <button type={type} aria-label={label} title={label} aria-pressed={pressed} className={iconButtonClass(size, tone, className)} {...props}>
      <Swap icon={icon} />
    </button>
  );
}
