import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

/** Mono technical label with a drafting-line lead-in. */
export function Eyebrow({ className, children, line = true, ...rest }: HTMLAttributes<HTMLSpanElement> & { line?: boolean }) {
  return (
    <span className={cn('eyebrow inline-flex items-center gap-2', className)} {...rest}>
      {line && <span className="h-px w-4 bg-current opacity-50" aria-hidden />}
      {children}
    </span>
  );
}
