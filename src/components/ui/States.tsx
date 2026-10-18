import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Empty state with a small architectural line composition instead of an illustration. */
export function EmptyState({ title, body, action, className, compact }: {
  title: string; body?: ReactNode; action?: ReactNode; className?: string; compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-14', className)}>
      {!compact && (
        <svg width="112" height="64" viewBox="0 0 112 64" fill="none" aria-hidden className="mb-5 text-line-strong">
          <path d="M4 60h104" stroke="currentColor" />
          <path d="M18 60V30h34v30M52 38h28v22M30 30V20h14v10" stroke="currentColor" />
          <path d="M60 46h8v14M24 40h8v8h-8z" stroke="currentColor" strokeOpacity=".6" />
          <path d="M4 22h104" stroke="rgb(var(--c-accent))" strokeOpacity=".5" strokeDasharray="2 3" />
          <circle cx="92" cy="14" r="5" stroke="rgb(var(--c-accent))" strokeOpacity=".6" />
        </svg>
      )}
      <div className="text-[14px] font-medium text-ink">{title}</div>
      {body && <div className="mt-1.5 max-w-[42ch] text-[12.5px] leading-relaxed text-muted">{body}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-[6px]', className)} aria-hidden />;
}

/** Inline error panel with optional retry. */
export function ErrorState({ title = 'Something went wrong', body, action }: { title?: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-card border border-critical/25 bg-critical/[0.06] p-4">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-critical" />
      <div className="flex-1">
        <div className="text-[13px] font-medium text-ink">{title}</div>
        {body && <div className="mt-1 text-[12.5px] leading-relaxed text-muted">{body}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
