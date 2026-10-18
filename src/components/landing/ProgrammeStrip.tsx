'use client';
import { motion } from 'framer-motion';
import { ease } from '@/motion/tokens';
import { fmtDate } from '@/lib/format';

type Stage = { ord: number; name: string; from: number; to: number; activities: number };

/** The four stages drawn to scale across the programme; bars draw in as they enter view. */
export function ProgrammeStrip({ stages, weeks, start, milestones }: {
  stages: Stage[]; weeks: number; start: string; milestones: { name: string; date: string }[];
}) {
  const s0 = +new Date(start);
  const wk = (date: string) => (+new Date(date) - s0) / (7 * 86400000);
  const ticks = Array.from({ length: Math.floor(weeks / 13) + 1 }, (_, i) => i * 13);

  return (
    <div className="relative">
      {/* axis */}
      <div className="relative ml-0 h-6 border-b border-line md:ml-[240px]">
        {ticks.map(t => (
          <span key={t} className="num absolute bottom-1 -translate-x-1/2 text-[10px] text-faint" style={{ left: `${(t / weeks) * 100}%` }}>W{t}</span>
        ))}
      </div>
      <div className="flex flex-col">
        {stages.map((s, i) => (
          <div key={s.ord} className="group grid grid-cols-1 items-center gap-2 border-b border-line py-5 md:grid-cols-[240px_1fr] md:gap-0">
            <div className="flex items-baseline gap-3 pr-6">
              <span className="num text-[11px] text-accent">{String(s.ord).padStart(2, '0')}</span>
              <span className="text-[14px] font-medium text-ink">{s.name}</span>
            </div>
            <div className="relative h-9">
              {ticks.map(t => <span key={t} aria-hidden className="absolute inset-y-0 w-px bg-line/70" style={{ left: `${(t / weeks) * 100}%` }} />)}
              <motion.div
                className="absolute inset-y-1.5 origin-left rounded-[4px] bg-ink/[0.07] ring-1 ring-inset ring-ink/10"
                style={{ left: `${(s.from / weeks) * 100}%`, width: `${((s.to - s.from) / weeks) * 100}%` }}
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 1.1, ease: ease.swoop, delay: 0.1 + i * 0.12 }}>
                <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-[4px] bg-accent" />
                <span className="num absolute inset-y-0 left-3 flex items-center whitespace-nowrap text-[10.5px] text-muted">
                  W{s.from}–W{s.to} · {s.activities} activities
                </span>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
      {/* milestones */}
      <div className="relative mt-2 h-10 md:ml-[240px] lg:h-36">
        {milestones.map((m, i) => {
          const x = Math.max(0, Math.min(100, (wk(m.date) / weeks) * 100));
          const tier = i % 3;                       // three label tiers so neighbours never collide
          const edge = x > 88 ? 'right' : x < 8 ? 'left' : 'center';
          return (
            <motion.div key={m.name} className="absolute top-0 flex flex-col"
              style={{ left: `${x}%`, alignItems: edge === 'right' ? 'flex-end' : edge === 'left' ? 'flex-start' : 'center', x: edge === 'right' ? '-100%' : edge === 'left' ? 0 : '-50%' }}
              initial={{ opacity: 0, y: -6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 + i * 0.08, ease: ease.swoop }}>
              <span className="h-2.5 w-2.5 rotate-45 border border-accent bg-canvas" style={{ margin: edge === 'center' ? 0 : '0 -5px' }} />
              <span className="w-px bg-line-strong" style={{ height: 10 + tier * 30, margin: edge === 'center' ? 0 : '0 -0.5px' }} />
              <span className={`hidden w-[124px] text-[11px] leading-tight text-ink-2 lg:block ${edge === 'right' ? 'text-right' : edge === 'left' ? 'text-left' : 'text-center'}`}>{m.name}</span>
              <span className="num mt-0.5 hidden text-[10px] text-faint lg:block">{fmtDate(m.date, { day: 'numeric', month: 'short', year: '2-digit' })}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
