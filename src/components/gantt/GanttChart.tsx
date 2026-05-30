'use client';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTimeline, PX_PER_DAY, type Zoom } from '@/stores/timeline';

export type GanttActivity = {
  id: string; name: string; stage_id: string | null; contractor_id: string | null;
  start_date: string; end_date: string; baseline_start: string | null; baseline_end: string | null;
  progress: number; status: string; is_critical: boolean;
};
export type GanttStage = { id: string; name: string; ord: number };
export type GanttContractor = { id: string; name: string; color: string };
export type GanttDep = { predecessor_id: string; successor_id: string };

const DAY = 86400000;
const ROW_H = 40;
const LABEL_W = 280;
const HEAD_H = 44;

export function GanttChart({ activities, stages, contractors, deps }: {
  activities: GanttActivity[]; stages: GanttStage[]; contractors: GanttContractor[]; deps: GanttDep[];
}) {
  const router = useRouter();
  const { zoom, contractorFilter, showCritical, showBaseline, setZoom, setContractor, toggleCritical, toggleBaseline } = useTimeline();
  const scrollRef = useRef<HTMLDivElement>(null);

  const ppd = PX_PER_DAY[zoom];
  const colorOf = useMemo(() => Object.fromEntries(contractors.map(c => [c.id, c.color])), [contractors]);

  // Time bounds
  const { min, max } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const a of activities) { lo = Math.min(lo, +new Date(a.start_date)); hi = Math.max(hi, +new Date(a.end_date)); }
    // pad 7 days each side
    return { min: lo - 7 * DAY, max: hi + 7 * DAY };
  }, [activities]);
  const totalDays = Math.max(1, Math.round((max - min) / DAY));
  const gridW = totalDays * ppd;
  const xOf = (d: string | number) => ((+new Date(d) - min) / DAY) * ppd;

  // Rows: stage header then its activities (filtered), keeping a flat render order for dependency math.
  const rows = useMemo(() => {
    const out: Array<{ type: 'stage'; name: string } | { type: 'act'; a: GanttActivity; rowIndex: number }> = [];
    let rowIndex = 0;
    const sorted = [...stages].sort((s1, s2) => s1.ord - s2.ord);
    for (const st of sorted) {
      const acts = activities.filter(a => a.stage_id === st.id && (!contractorFilter || a.contractor_id === contractorFilter));
      if (!acts.length) continue;
      out.push({ type: 'stage', name: st.name });
      for (const a of acts) { out.push({ type: 'act', a, rowIndex }); rowIndex++; }
    }
    return out;
  }, [activities, stages, contractorFilter]);

  const actRowY = useMemo(() => {
    const m: Record<string, number> = {};
    let y = 0;
    for (const r of rows) { if (r.type === 'stage') y += 28; else { m[r.a.id] = y + ROW_H / 2; y += ROW_H; } }
    return m;
  }, [rows]);
  const bodyH = rows.reduce((h, r) => h + (r.type === 'stage' ? 28 : ROW_H), 0);

  // Month ticks
  const months = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    const d = new Date(min); d.setDate(1); d.setMonth(d.getMonth() + 1);
    while (+d < max) { out.push({ x: xOf(+d), label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) }); d.setMonth(d.getMonth() + 1); }
    return out;
  }, [min, max, ppd]);

  const todayX = xOf(Date.now());

  // Drag-to-scroll (mouse)
  const drag = useRef<{ x: number; left: number } | null>(null);
  function onDown(e: React.MouseEvent) { if (!scrollRef.current) return; drag.current = { x: e.clientX, left: scrollRef.current.scrollLeft }; }
  function onMove(e: React.MouseEvent) { if (!drag.current || !scrollRef.current) return; scrollRef.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x); }
  function onUp() { drag.current = null; }

  const statusColor = (a: GanttActivity, base: string) =>
    a.status === 'delayed' ? '#B06070' : a.status === 'done' ? '#7A9E7E' : base;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
          {(['year', 'quarter', 'month', 'week'] as Zoom[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={`px-3 py-1 rounded-full text-[11.5px] font-semibold capitalize ${zoom === z ? 'bg-bark text-cream' : 'text-stone hover:text-bark'}`}>{z}</button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[11.5px] text-stone"><input type="checkbox" checked={showBaseline} onChange={toggleBaseline} /> Baseline</label>
        <label className="flex items-center gap-1.5 text-[11.5px] text-stone"><input type="checkbox" checked={showCritical} onChange={toggleCritical} /> Critical path</label>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          <Chip active={!contractorFilter} onClick={() => setContractor(null)} color="#7A9E7E" label="All" />
          {contractors.map(c => <Chip key={c.id} active={contractorFilter === c.id} onClick={() => setContractor(c.id)} color={c.color} label={c.name} />)}
        </div>
      </div>

      {/* Gantt */}
      <div className="rounded-panel border border-border bg-surface shadow-e2 overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
          <div style={{ width: LABEL_W + gridW, position: 'relative' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-surface border-b border-border" style={{ height: HEAD_H }}>
              <div className="absolute left-0 top-0 h-full flex items-center px-5 text-[9.5px] font-bold tracking-eyebrow uppercase text-stone" style={{ width: LABEL_W }}>Phase / Activity</div>
              {months.map((m, i) => (
                <div key={i} className="absolute top-0 h-full border-l border-border text-[10px] text-stone num pl-1 pt-1.5" style={{ left: LABEL_W + m.x }}>{m.label}</div>
              ))}
            </div>

            {/* Body */}
            <div style={{ position: 'relative', height: bodyH }}>
              {/* dependency layer */}
              <svg className="absolute pointer-events-none" style={{ left: LABEL_W, top: 0, width: gridW, height: bodyH, overflow: 'visible' }}>
                {deps.map((d, i) => {
                  const p = activities.find(a => a.id === d.predecessor_id), s = activities.find(a => a.id === d.successor_id);
                  if (!p || !s || actRowY[p.id] == null || actRowY[s.id] == null) return null;
                  const x1 = xOf(p.end_date), y1 = actRowY[p.id], x2 = xOf(s.start_date), y2 = actRowY[s.id];
                  return <path key={i} d={`M${x1},${y1} C${x1 + 16},${y1} ${x2 - 16},${y2} ${x2},${y2}`}
                    fill="none" stroke="var(--c-stone)" strokeOpacity="0.4" strokeWidth="1.2" markerEnd="url(#arr)" />;
                })}
                <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="var(--c-stone)" fillOpacity="0.5" /></marker></defs>
              </svg>

              {/* today line */}
              {todayX >= 0 && todayX <= gridW && (
                <div className="absolute top-0 w-px bg-iron/70 z-[5]" style={{ left: LABEL_W + todayX, height: bodyH }} />
              )}

              {/* rows */}
              {(() => { let y = 0; return rows.map((r, idx) => {
                if (r.type === 'stage') { const top = y; y += 28; return (
                  <div key={`s${idx}`} className="absolute left-0 flex items-center px-5 font-display text-[15px] font-semibold text-bark bg-surface-3 border-y border-sand" style={{ top, height: 28, width: LABEL_W + gridW }}>{r.name}</div>
                ); }
                const a = r.a; const top = y; y += ROW_H;
                const bx = xOf(a.start_date), bw = Math.max(4, xOf(a.end_date) - xOf(a.start_date));
                const base = colorOf[a.contractor_id ?? ''] ?? '#8C7B6B';
                const dim = showCritical && !a.is_critical;
                return (
                  <div key={a.id} className="absolute left-0 group" style={{ top, height: ROW_H, width: LABEL_W + gridW }}>
                    <div className="absolute left-0 h-full flex items-center px-5 border-b border-border bg-surface group-hover:bg-surface-2" style={{ width: LABEL_W }}>
                      <button onClick={() => router.push(`/activities/${a.id}`)} className="text-left">
                        <div className="text-[12.5px] text-text leading-tight line-clamp-1">{a.name}</div>
                        <div className="num text-[10px] text-stone">{a.progress}%</div>
                      </button>
                    </div>
                    <div className="absolute h-full border-b border-border" style={{ left: LABEL_W, width: gridW }} />
                    {/* baseline ghost */}
                    {showBaseline && a.baseline_start && a.baseline_end && (
                      <div className="absolute rounded-[3px] border border-stone/40" style={{ left: LABEL_W + xOf(a.baseline_start), width: Math.max(4, xOf(a.baseline_end) - xOf(a.baseline_start)), top: top + ROW_H - 9, height: 5, background: 'repeating-linear-gradient(45deg,var(--c-sand),var(--c-sand) 3px,transparent 3px,transparent 6px)', opacity: dim ? 0.15 : 0.6 }} />
                    )}
                    {/* actual/planned bar */}
                    <button onClick={() => router.push(`/activities/${a.id}`)} title={`${a.name} · ${a.progress}%`}
                      className="absolute rounded-[5px] transition" style={{
                        left: LABEL_W + bx, width: bw, top: top + 8, height: 16,
                        background: statusColor(a, base), opacity: dim ? 0.18 : 0.9,
                        boxShadow: showCritical && a.is_critical ? '0 0 0 2px var(--c-iron)' : 'none',
                      }}>
                      <span className="absolute inset-y-0 left-0 rounded-[5px] bg-black/15" style={{ width: `${a.progress}%` }} />
                    </button>
                  </div>
                );
              }); })()}
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-stone">Drag to scroll · click a bar to open the activity · striped = baseline, solid = plan, dark fill = % complete.</p>
    </div>
  );
}

function Chip({ active, onClick, color, label }: { active: boolean; onClick: () => void; color: string; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${active ? 'bg-bark text-cream border-bark' : 'bg-surface text-text-2 border-border hover:border-border-2'}`}>
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />{label}
    </button>
  );
}
