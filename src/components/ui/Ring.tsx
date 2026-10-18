'use client';
import { motion, useMotionValue, useTransform, animate, useReducedMotion, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { ease } from '@/motion/tokens';

type Props = {
  value: number;          // 0..1
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
  /** Secondary marker on the ring, 0..1 (e.g. planned-to-date). */
  marker?: number;
  className?: string;
};

export function Ring({ value, size = 96, stroke = 6, label, color = 'rgb(var(--c-accent))', marker, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, value));
  const offset = useMotionValue(c);
  const pct = useTransform(offset, v => Math.round(((c - v) / c) * 100));

  useEffect(() => {
    if (!inView) return;
    const to = c - c * target;
    if (reduce) { offset.set(to); return; }
    const ctrl = animate(offset, to, { duration: 1.4, ease: ease.swoop });
    return () => ctrl.stop();
  }, [inView, target, c, offset, reduce]);

  const markerAngle = marker != null ? Math.max(0, Math.min(1, marker)) * 2 * Math.PI : null;

  return (
    <div ref={ref} className={className} style={{ width: size, height: size, position: 'relative' }}
      role="img" aria-label={`${Math.round(target * 100)}%${label ? ` ${label}` : ''}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-ink))" strokeOpacity="0.08" strokeWidth={stroke} />
        {/* fine tick ring — drafting detail */}
        <circle cx={size / 2} cy={size / 2} r={r - stroke - 3} fill="none" stroke="rgb(var(--c-ink))" strokeOpacity="0.12"
          strokeWidth="1" strokeDasharray={`1 ${(2 * Math.PI * (r - stroke - 3)) / 60 - 1}`} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeLinecap="butt" style={{ strokeDashoffset: offset }} />
        {markerAngle != null && (
          <line stroke="rgb(var(--c-ink))" strokeWidth="1.5"
            x1={size / 2 + Math.cos(markerAngle) * (r - stroke / 2 - 3)} y1={size / 2 + Math.sin(markerAngle) * (r - stroke / 2 - 3)}
            x2={size / 2 + Math.cos(markerAngle) * (r + stroke / 2 + 3)} y2={size / 2 + Math.sin(markerAngle) * (r + stroke / 2 + 3)} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="flex items-baseline">
          <motion.span className="display text-ink" style={{ fontSize: size * 0.3 }}>{pct}</motion.span>
          <span className="num text-muted" style={{ fontSize: Math.max(9, size * 0.11) }}>%</span>
        </span>
        {label && <span className="eyebrow mt-0.5" style={{ fontSize: Math.max(8.5, size * 0.085) }}>{label}</span>}
      </div>
    </div>
  );
}
