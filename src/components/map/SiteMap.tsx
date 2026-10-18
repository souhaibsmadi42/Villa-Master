'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { activityStatus, toneColor } from '@/lib/status';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Ring } from '@/components/ui/Ring';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Controls';
import { cn } from '@/lib/cn';
import { spring } from '@/motion/tokens';

export type BuildingNode = {
  id: string; key: string; name: string; progress: number;
  /** Plan rectangle in % of the plan area, from building.map_* when recorded. */
  plan?: { x: number; y: number; w: number; h: number } | null;
  contractors: string[];
  activities: { id: string; name: string; progress: number; status: string }[];
  deliverables: number;
};

// Fallback arrangement used only when building.map_* is not recorded — schematic, not surveyed.
const PLAN: Record<string, { x: number; y: number; w: number; h: number }> = {
  boundary_wall: { x: 2, y: 2, w: 96, h: 96 },
  guard_house:   { x: 6, y: 78, w: 10, h: 12 },
  private_suite: { x: 10, y: 14, w: 22, h: 20 },
  main_chalet:   { x: 38, y: 16, w: 32, h: 28 },
  pool:          { x: 42, y: 50, w: 22, h: 9 },
  wellness:      { x: 74, y: 18, w: 18, h: 24 },
  courts:        { x: 54, y: 66, w: 38, h: 24 },
};

export function SiteMap({ buildings }: { buildings: BuildingNode[] }) {
  const [sel, setSel] = useState<BuildingNode | null>(buildings.find(b => b.activities.length) ?? null);
  const surveyed = buildings.some(b => b.plan);
  const rect = (b: BuildingNode) => b.plan ?? PLAN[b.key];
  const placed = buildings.filter(b => rect(b));

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <div className="flex flex-col gap-4">
        {/* Schematic plan */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-hero border border-line bg-surface shadow-e2">
          <div aria-hidden className="drafting-grid absolute inset-0" />
          
          <svg aria-hidden className="absolute bottom-4 right-4 h-10 w-10 text-muted" viewBox="0 0 40 40" fill="none"><path d="M20 4 L26 22 L20 18 L14 22 Z" fill="currentColor" /><text x="20" y="34" textAnchor="middle" fontSize="9" fill="currentColor" fontFamily="var(--font-mono)">N</text></svg>
          {placed.map((b, i) => {
            const p = rect(b)!;
            const active = sel?.id === b.id;
            const isWall = b.key === 'boundary_wall';
            return (
              <motion.button key={b.id} onClick={() => setSel(b)} aria-pressed={active} aria-label={`${b.name}: ${b.progress}%`}
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05, ...spring.panel }}
                className={cn('absolute rounded-[6px] text-left transition-colors',
                  isWall ? 'border-[3px] border-dashed bg-transparent' : 'border bg-raised/90 shadow-e1 backdrop-blur-sm',
                  active ? (isWall ? 'border-accent' : 'z-10 border-accent ring-4 ring-accent/15') : isWall ? 'border-line-strong hover:border-muted' : 'border-line-strong hover:border-ink/40')}
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%` }}>
                {!isWall && (
                  <>
                    <span className="absolute inset-x-0 bottom-0 origin-left rounded-b-[5px] bg-accent/20" style={{ height: `${b.progress}%`, maxHeight: '100%' }} />
                    <span className="relative block p-2">
                      <span className="block truncate text-[11px] font-medium text-ink sm:text-[12px]">{b.name}</span>
                      <span className="num block text-[10.5px] text-muted">{b.progress}%</span>
                    </span>
                  </>
                )}
                {isWall && <span className="num absolute -top-px right-3 -translate-y-1/2 bg-surface px-1.5 text-[10px] text-muted">{b.name} · {b.progress}%</span>}
              </motion.button>
            );
          })}
        </div>
        <p className="eyebrow -mt-1 text-[9.5px] text-faint">{surveyed ? 'Site plan from recorded building positions' : 'Schematic arrangement · not a surveyed plan'}</p>
        {/* Compact list (keyboard + mobile friendly) */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {buildings.map(b => (
            <button key={b.id} onClick={() => setSel(b)} aria-pressed={sel?.id === b.id}
              className={cn('rounded-card border p-3 text-left transition', sel?.id === b.id ? 'border-accent bg-raised' : 'border-line bg-surface hover:border-line-strong')}>
              <span className="block truncate text-[12px] text-ink">{b.name}</span>
              <ProgressBar className="mt-2" value={b.progress} height={2} />
            </button>
          ))}
        </div>
      </div>

      <Panel className="h-fit p-6 lg:sticky lg:top-24">
        <AnimatePresence mode="wait">
          {!sel ? (
            <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center text-[13px] text-muted">Select a building to see its progress, contractors and activities.</motion.p>
          ) : (
            <motion.div key={sel.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="eyebrow">Zone</div>
                  <h2 className="display mt-2 text-[32px] leading-none text-ink">{sel.name}</h2>
                  <div className="mt-2 text-[12px] text-muted">{sel.activities.length} activities · {sel.deliverables} deliverables</div>
                </div>
                <Ring value={sel.progress / 100} size={84} stroke={5} label="done" />
              </div>
              <div>
                <PanelHeader label="Responsible" />
                <div className="mt-2 flex flex-wrap gap-1.5">{sel.contractors.length ? sel.contractors.map(c => <Badge key={c}>{c}</Badge>) : <span className="text-[12px] text-faint">—</span>}</div>
              </div>
              <div>
                <PanelHeader label="Activities" meta={sel.activities.length} />
                <ul className="mt-2 flex flex-col divide-y divide-line">
                  {sel.activities.map(a => (
                    <li key={a.id}>
                      <Link href={`/activities/${a.id}`} className="group flex items-center gap-3 py-2.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: toneColor[activityStatus(a.status).tone] }} />
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink group-hover:text-accent">{a.name}</span>
                        <span className="num text-[11px] text-muted">{a.progress}%</span>
                        <ArrowUpRight size={12} className="text-faint group-hover:text-accent" />
                      </Link>
                    </li>
                  ))}
                  {sel.activities.length === 0 && <li className="py-3 text-[12px] text-faint">No activities linked to this zone.</li>}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>
    </div>
  );
}
