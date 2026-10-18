import Link from 'next/link';
import { ArrowRight, SquareChartGantt, FileCheck2, FolderOpen, Box, Sparkles, ScrollText } from 'lucide-react';
import { PROGRAMME } from '@/lib/seed-data';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingNav } from '@/components/landing/LandingNav';
import { ProgrammeStrip } from '@/components/landing/ProgrammeStrip';
import { MilestoneRoad } from '@/components/landing/MilestoneRoad';
import { Reveal, LineReveal } from '@/components/marketing/Reveal';
import { CursorLight } from '@/components/chrome/CursorLight';
import { ButtonLink } from '@/components/ui/Button';

// Short, factual descriptions of each zone (from the project brief in the repo).
const ZONE_NOTES: Record<string, string> = {
  main_chalet: 'Two-storey steel-framed duplex — the heart of the villa.',
  private_suite: 'Standalone suite in KONN precast panels.',
  wellness: 'Jacuzzi, sauna and steam below; gym on the upper floor.',
  courts: 'Football and paddle courts with a full glass enclosure.',
  boundary_wall: 'Stone-clad perimeter wall defining the site.',
  pool: '12 m × 5 m pool with its plant room.',
  guard_house: 'Light steel guard studio at the gate.',
};

const MODULES = [
  { icon: SquareChartGantt, t: 'Programme', d: 'A living Gantt of every activity, dependency and the critical path — with baseline against plan.' },
  { icon: FileCheck2, t: 'Deliverables', d: 'Submissions, reviews and approvals per contractor, with due dates that cannot quietly slip.' },
  { icon: FolderOpen, t: 'Documents', d: 'Drawings, BOQs, RFIs and submittals with versions, approvals and download history.' },
  { icon: Box, t: 'Model viewer', d: 'Open OBJ, FBX, glTF and STL models in the browser and keep them with the project.' },
  { icon: Sparkles, t: 'Project assistant', d: 'Ask about the programme in plain language — answered from live project data, never invented.' },
  { icon: ScrollText, t: 'Owner reporting', d: 'Weekly owner updates drafted from the real numbers, ready to review and send.' },
];

export default function Home() {
  const P = PROGRAMME;
  return (
    <main className="relative bg-canvas">
      <CursorLight />
      <LandingNav />
      <LandingHero facts={{ start: P.start, handover: P.handover, weeks: P.weeks, activities: P.activities, stages: P.stages.length, trades: P.trades.length }} />

      {/* The project — sticky editorial statement + zones */}
      <section id="project" className="relative scroll-mt-20 border-b border-line">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[1fr_1.15fr] lg:gap-20 lg:px-16 lg:py-36">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal><div className="eyebrow flex items-center gap-2"><span className="h-px w-6 bg-accent" />01 · The project</div></Reveal>
            <h2 className="display mt-6 text-[clamp(38px,5.4vw,76px)] text-ink">
              <LineReveal lines={[`${P.buildings.length} buildings`, 'on a terraced', <em key="h" className="italic text-accent">Ajloun hillside.</em>]} />
            </h2>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-[44ch] text-[15px] leading-relaxed text-muted">
                A private residence of stone, steel and precast — delivered by {P.trades.length} trades across {P.stages.length} stages.
                Villa Master holds the whole of it: who is doing what, by when, and what still needs a decision.
              </p>
            </Reveal>
          </div>
          <ol className="border-t border-line">
            {P.buildings.map((b, i) => (
              <Reveal key={b.key} delay={i * 0.05}>
                <li className="group grid grid-cols-[48px_1fr] gap-x-4 border-b border-line py-7 transition-colors hover:bg-ink/[0.015] sm:grid-cols-[64px_1fr_auto]">
                  <span className="num pt-2 text-[11px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="display text-[clamp(26px,3vw,36px)] text-ink transition-transform duration-swoop ease-swoop group-hover:translate-x-1">{b.name}</div>
                    <p className="mt-1.5 text-[13.5px] text-muted">{ZONE_NOTES[b.key]}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Programme to scale */}
      <section id="programme" className="relative scroll-mt-20 overflow-hidden border-b border-line">
        <div aria-hidden className="drafting-grid mask-fade-b absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-[1440px] px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Reveal><div className="eyebrow flex items-center gap-2"><span className="h-px w-6 bg-accent" />02 · Programme</div></Reveal>
              <h2 className="display mt-6 text-[clamp(38px,5.4vw,76px)] text-ink">
                <LineReveal lines={[`${P.stages.length} stages.`, <em key="w" className="italic text-accent">{P.weeks} weeks.</em>]} />
              </h2>
            </div>
            <Reveal delay={0.15}><p className="max-w-[40ch] text-[14px] leading-relaxed text-muted">Drawn to scale from the master programme: {P.activities} activities, from first concept to final handover. Stages overlap where the site allows.</p></Reveal>
          </div>
          <Reveal delay={0.1} className="mt-14"><ProgrammeStrip stages={P.stages} weeks={P.weeks} start={P.start} milestones={P.milestones} /></Reveal>
        </div>
      </section>

      {/* Trades */}
      <section id="trades" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[1fr_1.4fr] lg:px-16 lg:py-32">
          <div>
            <Reveal><div className="eyebrow flex items-center gap-2"><span className="h-px w-6 bg-accent" />03 · The trades</div></Reveal>
            <h2 className="display mt-6 text-[clamp(38px,5.4vw,76px)] text-ink">
              <LineReveal lines={[`${['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][P.trades.length] ?? P.trades.length} trades.`, <em key="o" className="italic text-accent">One programme.</em>]} />
            </h2>
          </div>
          <ul className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2">
            {P.trades.map((t, i) => (
              <Reveal key={t.key} delay={i * 0.05} className={i === P.trades.length - 1 && P.trades.length % 2 ? 'sm:col-span-2' : undefined}>
                <li className="flex h-full items-start gap-4 border-b border-r border-line p-6 transition-colors hover:bg-raised">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: t.color }} />
                  <div>
                    <div className="text-[15px] font-medium text-ink">{t.name}</div>
                    <div className="mt-0.5 text-[13px] text-muted">{t.scope}</div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Road to handover — dark cinematic band */}
      <section className="relative overflow-hidden bg-[#0D0E0C] text-chalk">
        <div aria-hidden className="grain absolute inset-0" />
        <div className="relative mx-auto grid max-w-[1440px] gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[1fr_1.4fr] lg:px-16 lg:py-32">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal><div className="eyebrow flex items-center gap-2 text-stone"><span className="h-px w-6 bg-bronze" />04 · Milestones</div></Reveal>
            <h2 className="display mt-6 text-[clamp(38px,5.4vw,76px)] text-chalk">
              <LineReveal lines={['The road', <em key="h" className="italic text-bronze">to handover.</em>]} />
            </h2>
          </div>
          <MilestoneRoad milestones={P.milestones} />
        </div>
      </section>

      {/* Platform */}
      <section id="platform" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto max-w-[1440px] px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
          <Reveal><div className="eyebrow flex items-center gap-2"><span className="h-px w-6 bg-accent" />05 · The platform</div></Reveal>
          <h2 className="display mt-6 max-w-[16ch] text-[clamp(38px,5.4vw,76px)] text-ink">
            <LineReveal lines={['Cinematic to explore.', <em key="e" className="italic text-accent">Effortless to run.</em>]} />
          </h2>
          <div className="mt-16 grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m, i) => (
              <Reveal key={m.t} delay={(i % 3) * 0.07}>
                <div className="group h-full border-b border-r border-line p-7 transition-colors duration-glide hover:bg-raised sm:p-9">
                  <m.icon size={20} strokeWidth={1.4} className="text-accent transition-transform duration-swoop ease-swoop group-hover:-translate-y-0.5" />
                  <div className="display mt-8 text-[28px] text-ink">{m.t}</div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{m.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-6 py-28 text-center sm:px-10 lg:py-40">
          <Reveal><div className="eyebrow">Villa Ajloun · Ajloun, Jordan</div></Reveal>
          <h2 className="display mx-auto mt-6 max-w-[18ch] text-[clamp(40px,6vw,88px)] text-ink">
            <LineReveal lines={['A private operating system', <em key="b" className="italic text-accent">for one extraordinary build.</em>]} />
          </h2>
          <Reveal delay={0.25} className="mt-10 flex justify-center">
            <ButtonLink href="/dashboard" variant="primary" size="lg" iconRight={<ArrowRight size={16} />}>Enter the workspace</ButtonLink>
          </Reveal>
          <p className="mt-5 text-[12.5px] text-faint">Access is limited to invited project members.</p>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-[12px] text-muted sm:px-10 lg:px-16">
          <span className="display text-[17px] text-ink">Villa <em className="italic text-accent">Master</em></span>
          <span className="num">Villa Ajloun · {P.start.slice(0, 4)}–{P.handover.slice(0, 4)}</span>
          <Link href="/login" className="hover:text-ink">Sign in →</Link>
        </div>
      </footer>
    </main>
  );
}
