import Link from 'next/link';
import { CursorLight } from '@/components/chrome/CursorLight';
import { HeroThreshold } from '@/components/scenes/HeroThreshold';
import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { GlassPanel } from '@/components/ui/GlassPanel';

const STATS = [
  { v: '108', l: 'weeks' }, { v: '5', l: 'contractors' }, { v: '33', l: 'activities' }, { v: '4', l: 'stages' },
];
const STAGES = [
  { n: '00', t: 'Design & Approvals', d: 'Concept → schematic → DD → municipality approval → BIM model.' },
  { n: '01', t: 'Boundary, Courts & Gym', d: 'Perimeter wall, guard house, football & paddle courts, gym structure.' },
  { n: '02', t: 'Main Structural Works', d: 'Foundations, precast suite, steel chalet, wellness centre, envelope, pool.' },
  { n: '03', t: 'Fit-out & Finishes', d: 'Interiors, joinery, MEP commissioning, landscape, snagging, handover.' },
];
const CONTRACTORS = [
  { n: 'Design / Admin', c: '#8C7B6B' }, { n: 'Boundary Wall Co.', c: '#C47C3A' }, { n: 'Courts Co.', c: '#7A6B8A' },
  { n: 'KONN — Precast', c: '#3C8EBF' }, { n: 'Steel Structure Co.', c: '#7A9E7E' }, { n: 'Fit-out Co.', c: '#B06070' },
];
const MILESTONES = [
  ['Site boundary complete', '29 Jul 2026'], ['Municipality approval', '13 Dec 2026'],
  ['Structure complete', '30 May 2027'], ['Pool commissioned', '22 Aug 2027'], ['Final handover', '5 Dec 2027'],
];

export default function Home() {
  return (
    <main className="relative">
      <CursorLight />

      {/* top bar */}
      <div className="fixed top-4 right-5 z-50">
        <Link href="/login" className="rounded-full bg-bark/90 text-cream backdrop-blur px-5 py-2.5 text-[12.5px] font-semibold hover:bg-bark transition shadow-e2">Sign in →</Link>
      </div>

      <HeroThreshold />

      {/* Stats band */}
      <section className="px-6 sm:px-14 lg:px-24 py-20 bg-cream">
        <Reveal><Eyebrow>The project at a glance</Eyebrow></Reveal>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <Reveal key={s.l} delay={i * 0.08}>
              <div className="font-display text-[clamp(44px,7vw,72px)] tracking-tighter leading-none">{s.v}</div>
              <div className="eyebrow mt-2">{s.l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Construction journey */}
      <section className="px-6 sm:px-14 lg:px-24 py-20 bg-sand/20">
        <Reveal><Eyebrow>Construction journey</Eyebrow>
          <h2 className="font-display text-[clamp(28px,5vw,48px)] tracking-tighter mt-2 max-w-2xl">Four stages, from a drawing to a home.</h2>
        </Reveal>
        <div className="mt-10 grid md:grid-cols-2 gap-5">
          {STAGES.map((st, i) => (
            <Reveal key={st.n} delay={i * 0.06}>
              <GlassPanel className="p-6 h-full">
                <div className="num text-olive text-[13px] font-medium">{st.n}</div>
                <div className="font-display text-[22px] mt-1">{st.t}</div>
                <p className="text-stone text-[13.5px] mt-2 leading-relaxed">{st.d}</p>
              </GlassPanel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Contractor ecosystem */}
      <section className="px-6 sm:px-14 lg:px-24 py-20 bg-cream">
        <Reveal><Eyebrow>The contractor ecosystem</Eyebrow>
          <h2 className="font-display text-[clamp(28px,5vw,48px)] tracking-tighter mt-2">Five trades, one programme.</h2>
        </Reveal>
        <div className="mt-10 flex flex-wrap gap-3">
          {CONTRACTORS.map((c, i) => (
            <Reveal key={c.n} delay={i * 0.05}>
              <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2.5 shadow-e1">
                <span className="h-3 w-3 rounded-sm" style={{ background: c.c }} />
                <span className="text-[13px] font-medium text-text-2">{c.n}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Milestones */}
      <section className="px-6 sm:px-14 lg:px-24 py-20 bg-bark text-cream">
        <Reveal><Eyebrow><span className="text-sand">Milestones</span></Eyebrow>
          <h2 className="font-display text-[clamp(28px,5vw,48px)] font-light mt-2">The road to handover.</h2>
        </Reveal>
        <div className="mt-10 flex flex-col gap-0">
          {MILESTONES.map(([name, date], i) => (
            <Reveal key={name} delay={i * 0.05}>
              <div className="flex items-center gap-4 py-4 border-b border-sand/20">
                <span className="h-2.5 w-2.5 rounded-full bg-brass shrink-0" />
                <span className="font-display text-[20px] flex-1">{name}</span>
                <span className="num text-[13px] text-sand">{date}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-28 bg-cream text-center">
        <Reveal>
          <Eyebrow><span className="block text-center">Villa Ajloun · Ajloun, Jordan</span></Eyebrow>
          <h2 className="font-display text-[clamp(32px,6vw,64px)] tracking-tighter mt-3 max-w-3xl mx-auto">A private operating system for one extraordinary build.</h2>
          <Link href="/login" className="inline-block mt-8 rounded-full bg-bark text-cream px-7 py-3.5 text-[14px] font-semibold hover:shadow-e4 transition">Enter the platform →</Link>
        </Reveal>
      </section>

      <footer className="px-6 sm:px-14 lg:px-24 py-10 bg-bark text-sand flex flex-wrap items-center justify-between gap-4 text-[12px]">
        <span>© 2026 Villa Ajloun · Built in Ajloun, Jordan<span className="text-brass">.</span></span>
        <span className="num">Construction Intelligence Platform</span>
      </footer>
    </main>
  );
}
