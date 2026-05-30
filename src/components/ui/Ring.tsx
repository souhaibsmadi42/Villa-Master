'use client';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

type Props = {
  value: number;          // 0..1
  size?: number;
  stroke?: number;
  label?: string;
};

export function Ring({ value, size = 96, stroke = 8, label }: Props) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = useMotionValue(c);
  const pct = useTransform(offset, v => Math.round(((c - v) / c) * 100));

  useEffect(() => {
    const target = c - c * Math.max(0, Math.min(1, value));
    if (reduce) { offset.set(target); return; }
    const ctrl = animate(offset, target, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    return () => ctrl.stop();
  }, [value, c, offset, reduce]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"  stopColor="var(--c-olive)" />
            <stop offset="100%" stopColor="var(--c-brass)" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
                stroke="var(--c-sand)" strokeOpacity="0.5" strokeWidth={stroke} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#ringGrad)" strokeWidth={stroke}
          strokeDasharray={c} strokeLinecap="round"
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <motion.span className="num text-[22px] font-medium text-ink">{pct}</motion.span>
        {label && <span className="text-[9px] tracking-eyebrow uppercase text-stone mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
