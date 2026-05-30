'use client';
import { useState } from 'react';
import Link from 'next/link';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Ring } from '@/components/ui/Ring';
import { Pill } from '@/components/ui/Pill';

export type BuildingNode = {
  id: string; key: string; name: string; progress: number;
  contractors: string[];
  activities: { id: string; name: string; progress: number; status: string }[];
  deliverables: number;
};

const ICON: Record<string, string> = {
  main_chalet: '🏛', private_suite: '🏠', wellness: '🧖', courts: '🎾', boundary_wall: '🧱', pool: '🏊', guard_house: '🛡',
};

export function SiteMap({ buildings }: { buildings: BuildingNode[] }) {
  const [sel, setSel] = useState<BuildingNode | null>(null);

  return (
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5">
      {/* Plan grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
        {buildings.map(b => (
          <button key={b.id} onClick={() => setSel(b)}
            className={`text-left rounded-panel border p-4 transition shadow-e1 hover:shadow-e3 ${sel?.id === b.id ? 'border-olive bg-olive/8' : 'border-border bg-surface'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[22px]">{ICON[b.key] ?? '◻'}</span>
              <span className="num text-[12px] text-stone">{b.progress}%</span>
            </div>
            <div className="font-display text-[16px] mt-2 leading-tight">{b.name}</div>
            <div className="mt-2 h-1.5 rounded-full bg-sand/50 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-olive to-brass" style={{ width: `${b.progress}%` }} />
            </div>
            <div className="text-[10.5px] text-stone mt-2">{b.activities.length} activities · {b.deliverables} deliverables</div>
          </button>
        ))}
      </div>

      {/* Detail */}
      <GlassPanel className="p-6 sticky top-20 h-fit">
        {!sel ? (
          <div className="text-stone text-[13px] py-10 text-center italic">Select a building to see its progress, contractors, and activities.</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Eyebrow>Zone</Eyebrow>
                <div className="font-display text-[24px] leading-tight mt-1">{sel.name}</div>
              </div>
              <Ring value={sel.progress / 100} size={64} label="done" />
            </div>
            <div>
              <Eyebrow>Responsible</Eyebrow>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {sel.contractors.length ? sel.contractors.map(c => <Pill key={c} tone="olive">{c}</Pill>) : <span className="text-stone text-[12px]">—</span>}
              </div>
            </div>
            <div>
              <Eyebrow>Related activities · {sel.activities.length}</Eyebrow>
              <div className="mt-2 flex flex-col gap-1.5">
                {sel.activities.map(a => (
                  <Link key={a.id} href={`/activities/${a.id}`} className="flex items-center gap-2 rounded-card bg-surface-2 border border-border px-3 py-2 hover:border-border-2">
                    <span className="text-[12.5px] text-text flex-1">{a.name}</span>
                    <span className="num text-[11px] text-stone">{a.progress}%</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
