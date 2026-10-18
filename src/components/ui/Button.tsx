'use client';
import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'inverse';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-quick ease-glide ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-offset-2';

const variants: Record<Variant, string> = {
  primary:   'bg-primary text-on-primary shadow-e1 hover:bg-primary/90 hover:shadow-e2',
  secondary: 'bg-raised text-ink border border-line hover:border-line-strong hover:bg-surface shadow-e1',
  ghost:     'text-ink-2 hover:text-ink hover:bg-ink/[0.05]',
  danger:    'bg-critical/10 text-critical border border-critical/25 hover:bg-critical hover:text-chalk',
  accent:    'bg-success/12 text-success border border-success/25 hover:bg-success hover:text-chalk',
  inverse:   'bg-chalk text-obsidian hover:bg-limestone shadow-e2',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[11.5px] rounded-[6px]',
  sm: 'h-8 px-3 text-[12.5px] rounded-[7px]',
  md: 'h-10 px-4 text-[13px] rounded-[8px]',
  lg: 'h-12 px-6 text-[14px] rounded-[10px]',
};

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode; iconRight?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, iconRight, className, children, disabled, type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Spinner size={size === 'lg' ? 16 : 13} /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

type LinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode; iconRight?: ReactNode };

export function ButtonLink({ variant = 'secondary', size = 'md', icon, iconRight, className, children, ...rest }: LinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}{children}{iconRight}
    </Link>
  );
}

export function IconButton({ label, className, size = 'md', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md' }) {
  return (
    <button type="button" aria-label={label} title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-[8px] text-muted transition duration-quick ease-glide',
        'hover:bg-ink/[0.06] hover:text-ink active:scale-[0.94] disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
        className,
      )} {...rest} />
  );
}
