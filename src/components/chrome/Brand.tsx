import { cn } from '@/lib/cn';

/** Villa Master mark: a plan square with a cut — a drafted threshold. */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden className={cn('shrink-0', className)}>
      <rect x="0.5" y="0.5" width="27" height="27" rx="6.5" fill="rgb(var(--c-primary))" />
      <path d="M8 19V9h12v10" stroke="rgb(var(--c-on-primary))" strokeWidth="1.3" />
      <path d="M12 19v-5h4v5" stroke="rgb(var(--c-bronze))" strokeWidth="1.3" />
      <path d="M6 19h16" stroke="rgb(var(--c-on-primary))" strokeOpacity=".55" strokeWidth="1" />
    </svg>
  );
}

export function Wordmark({ className, sub }: { className?: string; sub?: string }) {
  return (
    <span className={cn('flex flex-col leading-none', className)}>
      <span className="display text-[19px] tracking-[-0.01em] text-ink">Villa <em className="italic text-accent">Master</em></span>
      {sub && <span className="eyebrow mt-1 text-[9.5px]">{sub}</span>}
    </span>
  );
}
