'use client';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useRef } from 'react';
import { fmtDate } from '@/lib/format';

/** Vertical road to handover; the line fills as the reader scrolls through it. */
export function MilestoneRoad({ milestones }: { milestones: { name: string; date: string }[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <ol ref={ref} className="relative ml-2 border-l border-chalk/10 pl-8 sm:pl-12">
      <motion.span aria-hidden className="absolute -left-px top-0 h-full w-px origin-top bg-bronze" style={{ scaleY: fill }} />
      {milestones.map((m, i) => (
        <motion.li key={m.name} className="relative grid grid-cols-1 gap-1 border-b border-chalk/10 py-6 sm:grid-cols-[1fr_auto] sm:items-baseline"
          initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: i * 0.04 }}>
          <span aria-hidden className="absolute -left-[37px] top-[34px] h-2.5 w-2.5 rotate-45 border border-bronze bg-[#0D0E0C] sm:-left-[53px]" />
          <span className="display text-[clamp(24px,3.2vw,38px)] text-chalk">{m.name}</span>
          <span className="num text-[12px] text-stone">{fmtDate(m.date)}</span>
        </motion.li>
      ))}
    </ol>
  );
}
