'use client';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, type CSSProperties } from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { Elevation } from '@/components/scenes/Elevation';
import { Magnet } from '@/components/ui/Magnet';
import { ButtonLink } from '@/components/ui/Button';
import { fmtDate } from '@/lib/format';

type Facts = { start: string; handover: string; weeks: number; activities: number; stages: number; trades: number };

// Delays are offsets from --intro-delay (0 for returning visitors, see app/layout.tsx).
const at = (s: number): CSSProperties => ({ animationDelay: `calc(var(--intro-delay) + ${s}s)` });

export function LandingHero({ facts }: { facts: Facts }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '14%']);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.06]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // After the first full sequence, returning visitors get the short version.
  useEffect(() => { try { localStorage.setItem('vm-intro-seen', '1'); } catch {} }, []);

  const meta = [
    ['Programme', `${fmtDate(facts.start, { month: 'short', year: 'numeric' })} → ${fmtDate(facts.handover, { month: 'short', year: 'numeric' })}`],
    ['Duration', `${facts.weeks} weeks`],
    ['Activities', String(facts.activities)],
    ['Stages', String(facts.stages)],
    ['Trades', String(facts.trades)],
  ];

  return (
    <section ref={ref} aria-label="Villa Master" className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-[#0D0E0C] text-chalk">
      {/* 1 — dark canvas + wordmark (first visit only) */}
      <div aria-hidden className="intro-curtain pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[#0D0E0C]"
        style={{ animation: 'vm-curtain 1.9s var(--ease-glide) forwards' }}>
        <span className="display text-[clamp(20px,3vw,30px)] uppercase text-limestone" style={{ animation: 'vm-wordmark 1.6s var(--ease-swoop) forwards' }}>
          Villa <em className="italic text-bronze">Master</em>
        </span>
      </div>

      {/* 2 — architectural image emerges through a mask */}
      <motion.div style={{ y: imgY, scale: imgScale }} className="absolute inset-0 origin-bottom">
        <div className="absolute inset-0" style={{ animation: 'vm-mask-open 1.3s var(--ease-cinematic) both', animationDelay: 'calc(var(--intro-delay) - .45s)' }}>
          <div className="absolute inset-0" style={{ animation: 'vm-scale-settle 2.6s var(--ease-swoop) both', animationDelay: 'calc(var(--intro-delay) - .45s)' }}>
            <Elevation animated className="hidden h-full w-full md:block" frame="wide" align="xMaxYMid" />
            <Elevation animated className="mt-14 h-[38%] w-full md:hidden" annotations={false} />
          </div>
        </div>
      </motion.div>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,14,12,.92)_0%,rgba(13,14,12,.55)_38%,rgba(13,14,12,0)_70%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(13,14,12,.95),rgba(13,14,12,0))]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,#0D0E0C_50%,rgba(13,14,12,.5)_58%,rgba(13,14,12,0)_70%)] md:hidden" />
      <div aria-hidden className="grain absolute inset-0" />

      {/* 3–5 — headline, copy, actions */}
      <motion.div style={{ y: copyY, opacity: fade }}
        className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-end px-6 pb-[112px] sm:px-10 sm:pb-[170px] lg:px-16">
        <div className="eyebrow flex items-center gap-3 text-stone anim-fade-up" style={at(0.15)}>
          <span className="h-px w-8 bg-bronze" /> Villa Ajloun · Ajloun, Jordan
        </div>
        <h1 className="display mt-6 text-[clamp(52px,9.2vw,148px)] leading-[0.9] text-chalk">
          <span className="block overflow-hidden pb-[0.06em]"><span className="anim-rise block" style={at(0.3)}>Every detail.</span></span>
          <span className="block overflow-hidden pb-[0.08em]"><span className="anim-rise block italic text-limestone/90" style={at(0.44)}>Under <span className="text-bronze">control.</span></span></span>
        </h1>
        <p className="anim-fade-up mt-5 max-w-[46ch] text-[14.5px] leading-relaxed text-stone sm:mt-7 sm:text-[16.5px]" style={at(0.7)}>
          Villa Master is the intelligence layer for one private villa — programme, contractors,
          deliverables, the model and every decision, held in one quiet place.
        </p>
        <div className="anim-fade-up mt-7 flex flex-wrap items-center gap-3 sm:mt-9" style={at(0.85)}>
          <Magnet>
            <ButtonLink href="/dashboard" variant="inverse" size="lg" iconRight={<ArrowRight size={16} className="transition-transform duration-glide group-hover:translate-x-0.5" />} className="group">
              Enter the workspace
            </ButtonLink>
          </Magnet>
          <a href="#project" className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-chalk/20 px-5 text-[14px] text-chalk/90 backdrop-blur-sm transition hover:border-chalk/45 hover:bg-chalk/[0.06]">
            Explore the project
          </a>
        </div>
      </motion.div>

      {/* 6 — verified metadata strip */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-chalk/10">
        <dl className="mx-auto flex max-w-[1440px] items-stretch overflow-x-auto px-6 no-scrollbar sm:px-10 lg:px-16">
          {meta.map(([k, v], i) => (
            <div key={k} className="anim-fade flex shrink-0 flex-col gap-1 border-r border-chalk/10 py-4 pr-6 last:border-r-0 sm:pr-10 [&:not(:first-child)]:pl-6 sm:[&:not(:first-child)]:pl-10" style={at(1.0 + i * 0.07)}>
              <dt className="eyebrow text-[9.5px] text-stone/70">{k}</dt>
              <dd className="num text-[12.5px] text-limestone">{v}</dd>
            </div>
          ))}
          <a href="#project" aria-label="Scroll to the project" className="anim-fade ml-auto hidden shrink-0 items-center gap-3 py-4 pl-6 text-stone transition hover:text-chalk md:flex" style={at(1.45)}>
            <span className="eyebrow text-[9.5px]">Scroll</span>
            <span className="relative block h-9 w-px overflow-hidden bg-chalk/15">
              <span className="absolute inset-x-0 top-0 h-3 bg-bronze" style={{ animation: 'vm-scroll-dot 2.4s var(--ease-glide) infinite' }} />
            </span>
            <ArrowDown size={13} className="md:hidden" />
          </a>
        </dl>
      </div>
    </section>
  );
}
