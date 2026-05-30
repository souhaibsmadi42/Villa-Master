'use client';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { useRef, useEffect, type PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  strength?: number;       // 0..1
  radius?: number;         // px from element center within which to react
  className?: string;
}>;

export function Magnet({ children, strength = 0.35, radius = 140, className }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 280, damping: 26, mass: 0.5 });
  const y = useSpring(useMotionValue(0), { stiffness: 280, damping: 26, mass: 0.5 });

  useEffect(() => {
    if (reduce) return;
    const el = ref.current; if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d < radius) { x.set(dx * strength); y.set(dy * strength); }
      else { x.set(0); y.set(0); }
    };
    const onLeave = () => { x.set(0); y.set(0); };
    window.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [radius, strength, reduce, x, y]);

  return (
    <motion.div ref={ref} style={{ x, y }} className={className}>
      {children}
    </motion.div>
  );
}
