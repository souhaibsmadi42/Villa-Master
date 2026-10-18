'use client';
import { motion } from 'framer-motion';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { spring } from '@/motion/tokens';

/** Segmented control with a sliding indicator. */
export function Segmented<T extends string>({ value, onChange, options, size = 'md', label, className }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; size?: 'sm' | 'md'; label: string; className?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex items-center rounded-[9px] border border-line bg-sunken/60 p-0.5', className)}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(o.value)}
            className={cn('relative rounded-[7px] font-medium capitalize transition-colors duration-quick',
              size === 'sm' ? 'h-6 px-2.5 text-[11px]' : 'h-7 px-3 text-[12px]',
              active ? 'text-ink' : 'text-muted hover:text-ink')}>
            {active && <motion.span layoutId={`seg-${id}`} transition={spring.snappy} className="absolute inset-0 rounded-[7px] bg-raised shadow-e1 ring-1 ring-line" />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Toggle switch — real state, animated knob. */
export function Switch({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label: string; className?: string }) {
  return (
    <label className={cn('inline-flex cursor-pointer select-none items-center gap-2 text-[12px] text-ink-2', className)}>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn('relative h-[18px] w-[30px] shrink-0 rounded-full transition-colors duration-glide',
          checked ? 'bg-ink' : 'bg-ink/15')}>
        <motion.span layout transition={spring.snappy}
          className={cn('absolute top-[2px] h-[14px] w-[14px] rounded-full bg-canvas shadow-e1', checked ? 'right-[2px]' : 'left-[2px]')} />
      </button>
      {label}
    </label>
  );
}

/** Horizontal progress bar animated with scaleX (no layout cost). */
export function ProgressBar({ value, tone = 'rgb(var(--c-accent))', marker, className, height = 4 }: {
  value: number; tone?: string; marker?: number; className?: string; height?: number;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('relative w-full overflow-visible rounded-full bg-ink/[0.08]', className)} style={{ height }}
      role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <motion.span className="absolute inset-y-0 left-0 w-full origin-left rounded-full" style={{ background: tone }}
        initial={{ scaleX: 0 }} whileInView={{ scaleX: v / 100 }} viewport={{ once: true }} animate={{ scaleX: v / 100 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
      {marker != null && (
        <span aria-hidden className="absolute -top-[3px] w-px bg-ink" style={{ left: `${Math.max(0, Math.min(100, marker))}%`, height: height + 6 }} />
      )}
    </div>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn('num inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-line bg-raised px-1 text-[10px] text-muted', className)}>{children}</kbd>;
}

/** Filter chip used for contractor/category filters. */
export function Chip({ active, onClick, children, color, count }: { active: boolean; onClick: () => void; children: ReactNode; color?: string; count?: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] border px-2.5 text-[12px] font-medium transition duration-quick ease-glide active:scale-[0.97]',
        active ? 'border-ink bg-ink text-canvas' : 'border-line bg-raised text-ink-2 hover:border-line-strong hover:text-ink')}>
      {color && <span className="h-2 w-2 rounded-[2px]" style={{ background: color }} />}
      {children}
      {count != null && <span className={cn('num text-[10.5px]', active ? 'text-canvas/60' : 'text-faint')}>{count}</span>}
    </button>
  );
}
