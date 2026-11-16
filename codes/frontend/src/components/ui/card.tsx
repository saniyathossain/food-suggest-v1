// A content card (Shell Console's Card, Pathya's solid look): white on the tinted ground, a hairline, a low shadow. A card that throws
// while drawing shows a small note in its own place: one card never takes the page down with it.
import * as React from 'react';
import { SectionBoundary } from '@/components/kit/sectionboundary';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...rest }, ref) => (
  <div ref={ref} className={cn('surface min-w-0 rounded-xl', className)} {...rest}>
    <SectionBoundary inline>{children}</SectionBoundary>
  </div>
));
Card.displayName = 'Card';

export const CardHeader = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 p-5 pb-3 sm:p-6 sm:pb-3', className)} {...rest} />
);
export const CardTitle = ({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-headline font-semibold', className)} {...rest} />
);
export const CardDescription = ({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-subhead text-muted-foreground', className)} {...rest} />
);
export const CardContent = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...rest} />
);
