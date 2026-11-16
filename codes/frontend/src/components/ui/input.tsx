// Text boxes, text areas and native selects on the shared `field` utility (Shell Console's inputs, Pathya's 44 px height).
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('field flex h-11 w-full min-w-0 rounded-lg px-3.5 text-callout disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('field flex min-h-[72px] w-full rounded-lg px-3.5 py-2.5 text-subhead disabled:opacity-50', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn('field h-11 w-full min-w-0 cursor-pointer rounded-lg px-3 text-subhead', className)} {...props} />
));
Select.displayName = 'Select';
