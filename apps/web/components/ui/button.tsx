/**
 * Button — the one interactive primitive every surface reuses. Variants cover
 * the real needs (primary CTA, quiet secondary, ghost, destructive) so callers
 * never hand-roll button styling. Renders a spinner + disables itself while a
 * request is in flight (`loading`), a pattern all the auth forms depend on.
 */
'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-card hover:brightness-105 hover:-translate-y-px active:translate-y-0',
  secondary: 'bg-surface-2 text-text border border-border hover:border-faint',
  ghost: 'text-text hover:bg-surface-2',
  danger: 'bg-crit text-white hover:brightness-105',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-[15px] rounded-lg gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all disabled:pointer-events-none disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
