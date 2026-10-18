'use client';
import { animate, useInView, useMotionValue, useReducedMotion, useTransform, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { ease } from '@/motion/tokens';

/** Counts up to a verified value once it scrolls into view; re-animates when the value changes. */
export function AnimatedNumber({ value, decimals = 0, className, format }: {
  value: number; decimals?: number; className?: string; format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, v => (format ? format(v) : v.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })));

  useEffect(() => {
    if (!inView) return;
    if (reduce) { mv.set(value); return; }
    const c = animate(mv, value, { duration: 1.1, ease: ease.swoop });
    return () => c.stop();
  }, [inView, value, mv, reduce]);

  return <motion.span ref={ref} className={className}>{text}</motion.span>;
}
