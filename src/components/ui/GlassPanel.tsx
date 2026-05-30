import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  radius?: 'chip' | 'card' | 'panel' | 'hero';
  elev?: 1 | 2 | 3 | 4 | 5;
};

const radiusMap = {
  chip:  'rounded-chip',
  card:  'rounded-card',
  panel: 'rounded-panel',
  hero:  'rounded-hero',
};
const elevMap = { 1: 'shadow-e1', 2: 'shadow-e2', 3: 'shadow-e3', 4: 'shadow-e4', 5: 'shadow-e5' };

export function GlassPanel({ radius = 'card', elev = 2, className, children, ...rest }: Props) {
  return (
    <div
      className={cn(
        'relative glass',
        radiusMap[radius],
        elevMap[elev],
        // inner highlight
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]',
        'before:shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
