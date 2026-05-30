'use client';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useEffect } from 'react';

export function CursorLight() {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(-400), { stiffness: 120, damping: 22, mass: 0.5 });
  const y = useSpring(useMotionValue(-400), { stiffness: 120, damping: 22, mass: 0.5 });

  useEffect(() => {
    if (reduce) return;
    const handler = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [reduce, x, y]);

  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      style={{ x, y }}
      className="
        pointer-events-none fixed -ml-[190px] -mt-[190px] z-[1]
        h-[380px] w-[380px] rounded-full
        opacity-[0.05] mix-blend-multiply dark:mix-blend-screen
        bg-[radial-gradient(circle,var(--c-olive)_0%,transparent_65%)]
      "
    />
  );
}
