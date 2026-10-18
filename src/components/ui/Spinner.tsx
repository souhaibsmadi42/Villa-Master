import { cn } from '@/lib/cn';

export function Spinner({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={cn('animate-spin', className)} aria-hidden>
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="1.6" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Indeterminate progress — used when real progress is unknown (we never fake a %). */
export function IndeterminateBar({ className }: { className?: string }) {
  return (
    <div className={cn('relative h-[2px] w-full overflow-hidden rounded-full bg-ink/10', className)} role="progressbar" aria-busy="true">
      <span className="absolute inset-y-0 left-0 w-1/2 origin-left rounded-full bg-accent" style={{ animation: 'vm-indeterminate 1.3s var(--ease-glide) infinite' }} />
    </div>
  );
}
