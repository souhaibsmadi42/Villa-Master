'use client';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { useRef, useEffect, type PropsWithChildren } from 'react';
import { spring } from '@/motion/tokens';

type Props = PropsWithChildren<{ strength?: number; radius?: number; className?: string }>;

/** Subtle magnetic pull for a few primary actions. Disabled on touch and reduced motion. */
export function Magnet({ children, strength = 0.22, radius = 120, className }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), spring.soft);
  const y = useSpring(useMotionValue(0), spring.soft);

  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return;
    const el = ref.current; if (!el) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) < radius) { x.set(dx * strength); y.set(dy * strength); }
        else { x.set(0); y.set(0); }
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', onMove); };
  }, [radius, strength, reduce, x, y]);

  return <motion.div ref={ref} style={{ x, y }} className={className}>{children}</motion.div>;
}
