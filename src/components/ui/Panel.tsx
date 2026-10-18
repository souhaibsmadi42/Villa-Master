import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Eyebrow } from './Eyebrow';

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Translucent panel — only for surfaces that float over imagery or scrolled content. */
  glass?: boolean;
  elev?: 0 | 1 | 2 | 3 | 4;
  interactive?: boolean;
};

const elevMap = { 0: '', 1: 'shadow-e1', 2: 'shadow-e2', 3: 'shadow-e3', 4: 'shadow-e4' };

export function Panel({ glass, elev = 1, interactive, className, children, ...rest }: Props) {
  return (
    <div
      className={cn(
        'relative rounded-panel border',
        glass ? 'glass' : 'bg-surface border-line',
        elevMap[elev],
        interactive && 'transition-[box-shadow,border-color,transform] duration-glide ease-glide hover:-translate-y-px hover:border-line-strong hover:shadow-e3',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Panel header: technical label + optional right-hand slot. */
export function PanelHeader({ label, meta, action, className }: { label: ReactNode; meta?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <Eyebrow>{label}</Eyebrow>
        {meta != null && <span className="num text-[11px] text-faint">{meta}</span>}
      </div>
      {action}
    </div>
  );
}
