import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

export function Eyebrow({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2',
        'text-[11px] font-semibold tracking-eyebrow uppercase text-stone',
        className
      )}
      {...rest}
    >
      <span className="h-px w-6 bg-stone/40" aria-hidden />
      {children}
    </span>
  );
}
