'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Elevation, BUILDING_ANCHORS, VIEW_W, VIEW_H } from '@/components/scenes/Elevation';
import { Tooltip } from '@/components/ui/Tooltip';
import { ease } from '@/motion/tokens';

export type BuildingProgress = { key: string; name: string; progress: number; activities: number; delayed: number };

/**
 * The dashboard's dominant feature: the illustrative elevation with live progress
 * pinned to each building (weighted by its activities).
 */
export function SitePanel({ buildings }: { buildings: BuildingProgress[] }) {
  const pinned = buildings.filter(b => BUILDING_ANCHORS[b.key] && b.activities > 0);
  return (
    <div className="relative overflow-hidden rounded-hero bg-[#0D0E0C] text-chalk shadow-e3">
      <div className="relative aspect-[16/9] w-full">
        <motion.div className="absolute inset-0" initial={{ clipPath: 'inset(40% 0 40% 0)' }} animate={{ clipPath: 'inset(0% 0 0% 0)' }} transition={{ duration: 1.1, ease: ease.cinematic }}>
          <Elevation fit="meet" className="h-full w-full" annotations={false} />
        </motion.div>
        <div aria-hidden className="grain absolute inset-0" />
        {pinned.map((b, i) => {
          const a = BUILDING_ANCHORS[b.key];
          return (
            <motion.div key={b.key} className="absolute" style={{ left: `${(a.x / VIEW_W) * 100}%`, top: `${(a.y / VIEW_H) * 100}%` }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.08, duration: 0.5, ease: ease.swoop }}>
              <Tooltip side="top" content={<>{b.name} · {b.activities} activities{b.delayed ? ` · ${b.delayed} delayed` : ''}</>}>
                <Link href="/map" className="group flex -translate-x-1/2 -translate-y-full flex-col items-center" aria-label={`${b.name}: ${b.progress}% complete`}>
                  <span className="flex items-center gap-1.5 rounded-[6px] border border-chalk/15 bg-[#0D0E0C]/75 px-1.5 py-1 backdrop-blur-md transition group-hover:border-bronze/70 sm:px-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${b.delayed ? 'bg-[#D68679]' : b.progress >= 100 ? 'bg-[#8FAB85]' : 'bg-bronze'}`} />
                    <span className="num text-[10px] text-chalk sm:text-[11px]">{b.progress}%</span>
                  </span>
                  <span className="h-3 w-px bg-chalk/40 sm:h-5" />
                </Link>
              </Tooltip>
            </motion.div>
          );
        })}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
          <div>
            <div className="eyebrow text-stone">Site progress by building</div>
            <div className="mt-1 text-[11px] text-stone/70">Illustrative elevation · values from live activity data</div>
          </div>
        </div>
        <Link href="/map" className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-[8px] border border-chalk/15 bg-chalk/[0.06] px-3 py-1.5 text-[12px] text-chalk/90 backdrop-blur-md transition hover:border-chalk/35 sm:bottom-6 sm:right-6">
          Site map <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
