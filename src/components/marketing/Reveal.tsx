'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ease } from '@/motion/tokens';

/** Scroll-triggered reveal. `mask` opens content from a horizontal slit (for imagery). */
export function Reveal({ children, delay = 0, className, mask = false, y = 22 }: {
  children: ReactNode; delay?: number; className?: string; mask?: boolean; y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={mask ? { clipPath: 'inset(45% 0 45% 0)', opacity: 0.4 } : { opacity: 0, y }}
      whileInView={mask ? { clipPath: 'inset(0% 0 0% 0)', opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: mask ? 1.1 : 0.75, ease: mask ? ease.cinematic : ease.swoop, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Splits a headline into lines that rise in sequence when scrolled into view. */
export function LineReveal({ lines, className, lineClassName }: { lines: ReactNode[]; className?: string; lineClassName?: string }) {
  return (
    <motion.span className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span className={lineClassName ?? 'block'} variants={{ hidden: { y: '105%' }, show: { y: 0, transition: { duration: 0.9, ease: ease.swoop } } }}>{l}</motion.span>
        </span>
      ))}
    </motion.span>
  );
}
