import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/status';

const tones: Record<Tone, string> = {
  neutral:  'text-muted bg-ink/[0.045] border-ink/[0.08]',
  success:  'text-success bg-success/10 border-success/20',
  warning:  'text-warning bg-warning/10 border-warning/22',
  critical: 'text-critical bg-critical/10 border-critical/22',
  accent:   'text-accent bg-accent/10 border-accent/22',
  info:     'text-info bg-info/10 border-info/20',
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  /** Static dot. `live` adds a pulse — use only for genuinely live states. */
  dot?: boolean | 'live';
};

export function Badge({ tone = 'neutral', dot, className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-[6px] border px-2',
        'text-[11px] font-medium capitalize leading-none tracking-[0.01em]',
        tones[tone], className,
      )}
      {...rest}
    >
      {dot && (
        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-current">
          {dot === 'live' && <span className="absolute inset-0 rounded-full bg-current" style={{ animation: 'vm-pulse-ring 1.8s var(--ease-glide) infinite' }} />}
        </span>
      )}
      {children}
    </span>
  );
}
