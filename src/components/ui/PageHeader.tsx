import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Editorial page header: mono kicker, large serif title, supporting line, actions. */
export function PageHeader({ kicker, title, sub, actions, className, children }: {
  kicker: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode; className?: string; children?: ReactNode;
}) {
  return (
    <header className={cn('flex flex-col gap-5 border-b border-line pb-6 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        <div className="eyebrow flex items-center gap-2"><span className="h-px w-4 bg-current opacity-50" />{kicker}</div>
        <h1 className="display mt-3 text-[clamp(36px,5vw,60px)] text-ink">{title}</h1>
        {sub && <p className="mt-3 max-w-[64ch] text-[13.5px] leading-relaxed text-muted">{sub}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
