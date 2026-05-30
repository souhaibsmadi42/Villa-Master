'use client';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';
import { Magnet } from '@/components/ui/Magnet';
import { Ring } from '@/components/ui/Ring';
import { staggerKids, swoopIn, splitLineUp, cinematicReveal } from '@/motion/variants';

const KEYFRAMES = `
@keyframes vaFloat { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-18px,0); } }
@keyframes vaScrollDot { 0% { transform: translateY(-100%); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(140%); opacity: 0; } }
`;

export function HeroThreshold() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const yCards = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0]);

  return (
    <section ref={ref} className="relative min-h-[100svh] w-full overflow-hidden hero-ambient" aria-label="Villa Ajloun threshold">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <motion.div aria-hidden style={{ y: y1 }} className="absolute inset-x-0 bottom-0 h-[48%] bg-[radial-gradient(120%_60%_at_50%_100%,var(--c-sand)_0%,transparent_55%)] opacity-70" />
      <Particles />

      <motion.div style={{ y: y2, opacity }} className="relative z-10 pt-32 sm:pt-40 px-8 sm:px-14 lg:px-24 flex items-center gap-3">
        <Eyebrow>Villa Ajloun · Construction Intelligence Platform</Eyebrow>
      </motion.div>

      <motion.div style={{ opacity }} variants={staggerKids} initial="hidden" animate="show" className="relative z-10 px-8 sm:px-14 lg:px-24 mt-6 max-w-[1200px]">
        <h1 className="font-display tracking-tighter text-bark text-[clamp(44px,8vw,112px)] leading-[1.02]">
          <span className="block overflow-hidden"><motion.span variants={splitLineUp} className="block">A villa</motion.span></span>
          <span className="block overflow-hidden"><motion.span variants={splitLineUp} className="block italic text-[0.62em] text-stone mt-2">is being built in Ajloun.</motion.span></span>
        </h1>

        <motion.div variants={swoopIn} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] num text-stone">
          <span className="inline-flex items-center gap-1.5"><MapPin size={12} className="text-olive" />32.34° N · 35.75° E</span>
          <span>·</span><span>Jun 2026 → Dec 2027</span><span>·</span><span>5 contractors</span><span>·</span>
          <Pill tone="olive" dot>Phase: Foundations</Pill>
        </motion.div>

        <motion.div variants={swoopIn} className="mt-10 flex flex-wrap items-center gap-3">
          <Magnet>
            <a href="/dashboard" className="group inline-flex items-center gap-2 rounded-full bg-bark text-cream px-5 py-3 text-[13px] font-semibold tracking-wide shadow-e3 hover:shadow-e4 transition-all duration-glide ease-glide">
              Enter Dashboard
              <ArrowRight size={14} className="transition-transform duration-glide group-hover:translate-x-0.5" />
            </a>
          </Magnet>
          <Magnet strength={0.25}>
            <a href="/timeline" className="inline-flex items-center gap-2 rounded-full hairline bg-cream/40 backdrop-blur px-5 py-3 text-[13px] font-medium text-bark hover:bg-cream/70 transition">
              View Timeline
            </a>
          </Magnet>
        </motion.div>
      </motion.div>

      <motion.div style={{ y: yCards, opacity }} className="pointer-events-none absolute right-6 sm:right-14 lg:right-24 top-44 sm:top-56 z-10 grid gap-3">
        <FloatingCard eyebrow="Today on site" title="Foundation pour — Zone B" tone="olive" delay={0.1} />
        <FloatingCard eyebrow="Next milestone" title="Steel package handover" sub="Aug 14" tone="brass" delay={0.22} />
        <FloatingCard eyebrow="Health" ringValue={0.94} delay={0.34} />
      </motion.div>

      <motion.div style={{ opacity }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.6 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="flex flex-col items-center gap-2 text-stone">
          <span className="eyebrow">Begin</span>
          <span className="block h-10 w-px bg-stone/40 overflow-hidden relative">
            <span className="absolute inset-x-0 top-0 h-3 bg-bark" style={{ animation: 'vaScrollDot 2.2s ease-in-out infinite' }} />
          </span>
        </div>
      </motion.div>
    </section>
  );
}

function FloatingCard({ eyebrow, title, sub, tone = 'olive', ringValue, delay = 0 }: {
  eyebrow: string; title?: string; sub?: string; tone?: 'olive' | 'brass' | 'iron'; ringValue?: number; delay?: number;
}) {
  return (
    <motion.div variants={cinematicReveal} initial="hidden" animate="show" transition={{ delay }} className="pointer-events-auto">
      <GlassPanel radius="card" elev={3} className="w-[240px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow mb-1.5">{eyebrow}</div>
            {title && <div className="font-display text-[18px] leading-tight text-bark">{title}</div>}
            {sub && <div className="num mt-1 text-[11.5px] text-stone">{sub}</div>}
          </div>
          {typeof ringValue === 'number' && <Ring value={ringValue} size={48} stroke={5} />}
        </div>
        {!ringValue && (
          <div className="mt-3 flex items-center gap-2">
            <Pill tone={tone} dot>live</Pill>
            <span className="num text-[10.5px] text-stone">updated 11:42</span>
          </div>
        )}
      </GlassPanel>
    </motion.div>
  );
}

function Particles() {
  const pts = Array.from({ length: 60 }, (_, i) => ({
    x: (i * 53) % 100, y: (i * 37) % 100, d: 8 + ((i * 7) % 10), s: 1 + ((i % 4) * 0.4), o: 0.04 + (i % 5) * 0.018,
  }));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[0] overflow-hidden">
      {pts.map((p, i) => (
        <span key={i} className="absolute rounded-full bg-bark"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, opacity: p.o, animation: `vaFloat ${p.d}s ease-in-out infinite` }} />
      ))}
    </div>
  );
}
