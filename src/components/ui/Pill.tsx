import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'olive' | 'sun' | 'iron' | 'brass' | 'stone';
  dot?: boolean;
};

const tones = {
  olive: 'text-olive  bg-olive/12 border-olive/24',
  sun:   'text-sun    bg-sun/12   border-sun/24',
  iron:  'text-iron   bg-iron/12  border-iron/24',
  brass: 'text-brass  bg-brass/14 border-brass/30',
  stone: 'text-stone  bg-stone/12 border-stone/22',
};

export function Pill({ tone = 'stone', dot, className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        'px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.06em] uppercase',
        tones[tone],
        className
      )}
      {...rest}
    >
      {dot && (
        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-current">
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
        </span>
      )}
      {children}
    </span>
  );
}
