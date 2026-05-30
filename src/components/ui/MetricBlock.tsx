'use client';
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  value: number;
  label: string;
  unit?: string;
  sub?: string;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
};

const sizeMap = {
  md: 'text-[32px] leading-none',
  lg: 'text-[48px] leading-none',
  xl: 'text-[64px] leading-none',
};

export function MetricBlock({ value, label, unit, sub, size = 'xl', className }: Props) {
  const reduce = useReducedMotion();
  const sv = useSpring(0, { stiffness: 80, damping: 20, mass: 0.6 });
  const display = useTransform(sv, v => Math.round(v).toLocaleString());

  useEffect(() => { reduce ? sv.set(value) : sv.set(value); }, [value, sv, reduce]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="eyebrow">{label}</span>
      <div className="flex items-baseline gap-2">
        <motion.span className={cn('font-display tracking-tighter', sizeMap[size])}>
          {display}
        </motion.span>
        {unit && <span className="text-stone text-base">{unit}</span>}
      </div>
      {sub && <p className="text-stone text-[12.5px]">{sub}</p>}
    </div>
  );
}
