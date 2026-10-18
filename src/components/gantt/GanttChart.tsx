'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Crosshair, ArrowUpRight, X } from 'lucide-react';
import { useTimeline, PX_PER_DAY, type Zoom } from '@/stores/timeline';
import { cn } from '@/lib/cn';
import { activityStatus, toneColor } from '@/lib/status';
import { fmtDate, daysBetween } from '@/lib/format';
import { spring } from '@/motion/tokens';
import { Segmented, Switch, Chip } from '@/components/ui/Controls';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Controls';

export type GanttActivity = {
  id: string; name: string; stage_id: string | null; contractor_id: string | null;
  start_date: string; end_date: string; baseline_start: string | null; baseline_end: string | null;
  progress: number; status: string; is_critical: boolean;
};
export type GanttStage = { id: string; name: string; ord: number };
export type GanttContractor = { id: string; name: string; color: string };
export type GanttDep = { predecessor_id: string; successor_id: string };
export type GanttMilestone = { id: string; name: string; planned_date: string | null; actual_date: string | null; status: string };

const DAY = 86400000;
const ROW_H = 40, STAGE_H = 34, MS_H = 36, HEAD_H = 52;
const t = (d: string | number | Date) => +new Date(d);
const startOfMonth = (ms: number) => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); };
const addMonths = (ms: number, n: number) => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1); };

type Tick = { x: number; w: number; label: string };

function buildTicks(min: number, max: number, zoom: Zoom, xOf: (ms: number) => number) {
  const top: Tick[] = [], bottom: Tick[] = [];
  const span = (a: number, b: number, label: string, into: Tick[]) => into.push({ x: xOf(a), w: xOf(b) - xOf(a), label });
  const mName = (ms: number, style: 'short' | 'narrow' = 'short') => new Date(ms).toLocaleDateString('en-GB', { month: style, timeZone: 'UTC' });
  const year = (ms: number) => new Date(ms).getUTCFullYear();

  if (zoom === 'week') {
    for (let m = startOfMonth(min); m < max; m = addMonths(m, 1)) span(m, Math.min(addMonths(m, 1), max), `${mName(m)} ${year(m)}`, top);
    // Mondays
    let d = min; while (new Date(d).getUTCDay() !== 1) d += DAY;
    for (; d < max; d += 7 * DAY) span(d, d + 7 * DAY, String(new Date(d).getUTCDate()), bottom);
  } else if (zoom === 'month') {
    for (let m = startOfMonth(min); m < max; m = addMonths(m, 3 - (new Date(m).getUTCMonth() % 3))) {
      const q = Math.floor(new Date(m).getUTCMonth() / 3) + 1;
      span(m, Math.min(addMonths(m, 3 - (new Date(m).getUTCMonth() % 3)), max), `Q${q} ${year(m)}`, top);
    }
    for (let m = startOfMonth(min); m < max; m = addMonths(m, 1)) span(m, addMonths(m, 1), mName(m), bottom);
  } else if (zoom === 'quarter') {
    for (let y = year(min); y <= year(max); y++) span(Math.max(Date.UTC(y, 0, 1), min), Math.min(Date.UTC(y + 1, 0, 1), max), String(y), top);
    for (let m = startOfMonth(min); m < max; m = addMonths(m, 1)) span(m, addMonths(m, 1), mName(m, 'narrow'), bottom);
  } else {
    for (let y = year(min); y <= year(max); y++) span(Math.max(Date.UTC(y, 0, 1), min), Math.min(Date.UTC(y + 1, 0, 1), max), String(y), top);
    for (let m = startOfMonth(min); m < max; m = addMonths(m, 3 - (new Date(m).getUTCMonth() % 3))) {
      span(m, addMonths(m, 3 - (new Date(m).getUTCMonth() % 3)), `Q${Math.floor(new Date(m).getUTCMonth() / 3) + 1}`, bottom);
    }
  }
  return { top, bottom };
}

export function GanttChart({ activities, stages, contractors, deps, milestones = [], now }: {
  activities: GanttActivity[]; stages: GanttStage[]; contractors: GanttContractor[]; deps: GanttDep[]; milestones?: GanttMilestone[];
  /** Server timestamp so server and client agree on "today" during hydration. */
  now: number;
}) {
  const router = useRouter();
  const { zoom, contractorFilter, showCritical, showBaseline, colorBy, setZoom, setContractor, toggleCritical, toggleBaseline, setColorBy } = useTimeline();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [labelW, setLabelW] = useState(300);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const on = () => setLabelW(window.innerWidth < 640 ? 150 : window.innerWidth < 1024 ? 220 : 300);
    on(); window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const ppd = PX_PER_DAY[zoom];
  const colorOf = useMemo(() => Object.fromEntries(contractors.map(c => [c.id, c.color])), [contractors]);
  const nameOf = useMemo(() => Object.fromEntries(contractors.map(c => [c.id, c.name])), [contractors]);
  const byId = useMemo(() => new Map(activities.map(a => [a.id, a])), [activities]);

  // Bounds snapped to whole months, with breathing room.
  const { min, max } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const a of activities) {
      lo = Math.min(lo, t(a.start_date), a.baseline_start ? t(a.baseline_start) : Infinity);
      hi = Math.max(hi, t(a.end_date), a.baseline_end ? t(a.baseline_end) : -Infinity);
    }
    for (const m of milestones) if (m.planned_date) { lo = Math.min(lo, t(m.planned_date)); hi = Math.max(hi, t(m.planned_date)); }
    return { min: startOfMonth(lo - 10 * DAY), max: addMonths(startOfMonth(hi + 10 * DAY), 1) };
  }, [activities, milestones]);
  const gridW = Math.round(((max - min) / DAY) * ppd);
  const xOf = useCallback((d: string | number) => ((t(d) - min) / DAY) * ppd, [min, ppd]);
  const ticks = useMemo(() => buildTicks(min, max, zoom, xOf), [min, max, zoom, xOf]);
  const todayX = xOf(now);

  // Rows: stage header then its (filtered) activities.
  const rows = useMemo(() => {
    const out: Array<{ type: 'stage'; id: string; name: string; count: number; progress: number } | { type: 'act'; a: GanttActivity }> = [];
    for (const st of [...stages].sort((a, b) => a.ord - b.ord)) {
      const acts = activities.filter(a => a.stage_id === st.id && (!contractorFilter || a.contractor_id === contractorFilter));
      if (!acts.length) continue;
      const p = Math.round(acts.reduce((s, a) => s + a.progress, 0) / acts.length);
      out.push({ type: 'stage', id: st.id, name: st.name, count: acts.length, progress: p });
      if (!collapsed.has(st.id)) for (const a of acts) out.push({ type: 'act', a });
    }
    return out;
  }, [activities, stages, contractorFilter, collapsed]);

  const layout = useMemo(() => {
    const y: Record<string, number> = {};
    let cur = MS_H;
    const tops: number[] = [];
    for (const r of rows) { tops.push(cur); if (r.type === 'stage') cur += STAGE_H; else { y[r.a.id] = cur + ROW_H / 2; cur += ROW_H; } }
    return { y, tops, height: cur };
  }, [rows]);

  // Dependency neighbourhood of the focused activity.
  const focusId = hover?.id ?? selected;
  const related = useMemo(() => {
    if (!focusId) return null;
    const s = new Set([focusId]);
    deps.forEach(d => { if (d.predecessor_id === focusId) s.add(d.successor_id); if (d.successor_id === focusId) s.add(d.predecessor_id); });
    return s;
  }, [focusId, deps]);

  const scrollToToday = useCallback((smooth = true) => {
    const el = scrollRef.current; if (!el) return;
    el.scrollTo({ left: Math.max(0, todayX - (el.clientWidth - labelW) * 0.35), behavior: smooth ? 'smooth' : 'auto' });
  }, [todayX, labelW]);
  useEffect(() => { scrollToToday(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [zoom, labelW]);

  // Drag-to-scroll with the mouse (touch scrolls natively).
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse' || !scrollRef.current) return; drag.current = { x: e.clientX, left: scrollRef.current.scrollLeft, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !scrollRef.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    scrollRef.current.scrollLeft = drag.current.left - dx;
  };
  const onUp = () => { setTimeout(() => { drag.current = null; }, 0); };

  const barColor = (a: GanttActivity) => colorBy === 'status'
    ? toneColor[activityStatus(a.status).tone]
    : (colorOf[a.contractor_id ?? ''] ?? 'rgb(var(--c-muted))');

  const sel = selected ? byId.get(selected) : null;
  const hov = hover ? byId.get(hover.id) : null;
  const totalW = labelW + gridW;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Segmented label="Zoom" value={zoom} onChange={setZoom} options={(['year', 'quarter', 'month', 'week'] as Zoom[]).map(z => ({ value: z, label: z }))} />
          <Segmented label="Colour by" value={colorBy} onChange={setColorBy} size="sm" options={[{ value: 'contractor', label: 'Contractor' }, { value: 'status', label: 'Status' }]} />
          <Switch label="Baseline" checked={showBaseline} onChange={toggleBaseline} />
          <Switch label="Critical path" checked={showCritical} onChange={toggleCritical} />
          <Button size="sm" variant="ghost" icon={<Crosshair size={14} />} onClick={() => scrollToToday()} className="ml-auto">Today</Button>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar" role="group" aria-label="Filter by contractor">
          <Chip active={!contractorFilter} onClick={() => setContractor(null)}>All</Chip>
          {contractors.map(c => (
            <Chip key={c.id} active={contractorFilter === c.id} onClick={() => setContractor(contractorFilter === c.id ? null : c.id)} color={c.color}
              count={activities.filter(a => a.contractor_id === c.id).length}>{c.name}</Chip>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative overflow-hidden rounded-panel border border-line bg-surface shadow-e2">
        <div ref={scrollRef} className="relative max-h-[72vh] overflow-auto overscroll-x-contain"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
          style={{ cursor: drag.current ? 'grabbing' : 'grab' }}>
          <div style={{ width: totalW, position: 'relative' }}>
            {/* Header (sticky top) */}
            <div className="sticky top-0 z-20 flex border-b border-line bg-surface/95 backdrop-blur" style={{ height: HEAD_H, width: totalW }}>
              <div className="sticky left-0 z-10 flex h-full shrink-0 items-end border-r border-line bg-surface px-4 pb-2" style={{ width: labelW }}>
                <span className="eyebrow text-[9.5px]">Stage / activity</span>
              </div>
              <div className="relative h-full" style={{ width: gridW }}>
                {ticks.top.map((k, i) => (
                  <div key={`t${i}`} className="absolute top-0 flex h-1/2 items-center border-l border-line px-2" style={{ left: k.x, width: k.w }}>
                    <span className="num sticky truncate text-[10.5px] text-ink-2" style={{ left: labelW + 8 }}>{k.label}</span>
                  </div>
                ))}
                {ticks.bottom.map((k, i) => (
                  <div key={`b${i}`} className="absolute bottom-0 flex h-1/2 items-center border-l border-t border-line/70" style={{ left: k.x, width: k.w }}>
                    {k.w > 14 && <span className="num w-full truncate text-center text-[10px] text-faint">{k.label}</span>}
                  </div>
                ))}
                {todayX >= 0 && todayX <= gridW && (
                  <div className="absolute bottom-0 z-10 -translate-x-1/2 rounded-[4px] bg-critical px-1.5 py-[2px] text-[8.5px] font-medium tracking-[0.12em] text-chalk" style={{ left: todayX }}>TODAY</div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="relative" style={{ height: layout.height }}>
              {/* grid columns */}
              <div aria-hidden className="pointer-events-none absolute inset-y-0" style={{ left: labelW, width: gridW }}>
                {ticks.bottom.map((k, i) => <span key={i} className="absolute inset-y-0 w-px bg-line/60" style={{ left: k.x }} />)}
                {todayX >= 0 && todayX <= gridW && <span className="absolute inset-y-0 z-[6] w-px bg-critical" style={{ left: todayX }} />}
              </div>

              {/* milestone lane */}
              <div className="absolute left-0 flex border-b border-line" style={{ top: 0, height: MS_H, width: totalW }}>
                <div className="sticky left-0 z-10 flex h-full shrink-0 items-center gap-2 border-r border-line bg-surface px-4" style={{ width: labelW }}>
                  <span className="h-2 w-2 rotate-45 border border-accent" /><span className="text-[12px] font-medium text-ink-2">Milestones</span>
                </div>
                <div className="relative h-full" style={{ width: gridW }}>
                  {milestones.filter(m => m.planned_date).map(m => {
                    const achieved = m.status === 'achieved';
                    return (
                      <div key={m.id} className="group absolute top-1/2 z-[7] -translate-x-1/2 -translate-y-1/2" style={{ left: xOf(m.actual_date ?? m.planned_date!) }}>
                        <span tabIndex={0} aria-label={`${m.name}, ${achieved ? 'achieved' : 'planned'} ${fmtDate(m.actual_date ?? m.planned_date)}`}
                          className={cn('block h-3 w-3 rotate-45 border transition-transform duration-quick group-hover:scale-125',
                            achieved ? 'border-success bg-success' : m.status === 'missed' ? 'border-critical bg-critical' : 'border-accent bg-surface')} />
                        <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-max max-w-[220px] -translate-x-1/2 rounded-[7px] bg-obsidian px-2.5 py-1.5 text-[11.5px] text-chalk shadow-e3 group-hover:block group-focus-within:block dark:bg-limestone dark:text-obsidian">
                          {m.name}<span className="num block text-[10.5px] opacity-70">{achieved ? 'Achieved' : 'Planned'} {fmtDate(m.actual_date ?? m.planned_date)}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* dependency connectors */}
              <svg className="pointer-events-none absolute z-[4]" style={{ left: labelW, top: 0, width: gridW, height: layout.height, overflow: 'visible' }} aria-hidden>
                <defs>
                  <marker id="g-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" style={{ fill: 'rgb(var(--c-muted))' }} /></marker>
                  <marker id="g-arr-hi" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" style={{ fill: 'rgb(var(--c-accent))' }} /></marker>
                </defs>
                {deps.map((d, i) => {
                  const p = byId.get(d.predecessor_id), s = byId.get(d.successor_id);
                  if (!p || !s || layout.y[p.id] == null || layout.y[s.id] == null) return null;
                  const x1 = xOf(p.end_date), y1 = layout.y[p.id], x2 = xOf(s.start_date), y2 = layout.y[s.id];
                  const hi = !!focusId && (d.predecessor_id === focusId || d.successor_id === focusId);
                  const mid = Math.max(x1 + 10, Math.min(x2 - 10, (x1 + x2) / 2));
                  const path = x2 - x1 > 20
                    ? `M${x1},${y1} H${mid} V${y2} H${x2 - 1}`
                    : `M${x1},${y1} H${x1 + 8} V${(y1 + y2) / 2} H${x2 - 10} V${y2} H${x2 - 1}`;
                  return <path key={i} d={path} fill="none" markerEnd={hi ? 'url(#g-arr-hi)' : 'url(#g-arr)'}
                    style={{ stroke: hi ? 'rgb(var(--c-accent))' : 'rgb(var(--c-muted))', strokeOpacity: hi ? 0.95 : focusId ? 0.12 : 0.32, strokeWidth: hi ? 1.6 : 1, transition: 'stroke-opacity .25s, stroke .25s' }} />;
                })}
              </svg>

              {/* rows */}
              {rows.map((r, idx) => {
                const top = layout.tops[idx];
                if (r.type === 'stage') {
                  const open = !collapsed.has(r.id);
                  return (
                    <div key={`s-${r.id}`} className="absolute left-0 z-[3] flex border-y border-line bg-sunken/70" style={{ top, height: STAGE_H, width: totalW }}>
                      <button onClick={() => setCollapsed(c => { const n = new Set(c); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })}
                        aria-expanded={open} className="sticky left-0 z-10 flex h-full shrink-0 items-center gap-2 border-r border-line bg-sunken px-3 text-left" style={{ width: labelW }}>
                        <ChevronDown size={14} className={cn('shrink-0 text-muted transition-transform duration-glide', !open && '-rotate-90')} />
                        <span className="display truncate text-[16px] text-ink">{r.name}</span>
                        <span className="num ml-auto hidden shrink-0 text-[10.5px] text-faint sm:inline">{r.count} · {r.progress}%</span>
                      </button>
                    </div>
                  );
                }
                const a = r.a;
                const bx = xOf(a.start_date), bw = Math.max(6, xOf(t(a.end_date)) - bx);
                const dim = (showCritical && !a.is_critical) || (related && !related.has(a.id));
                const color = barColor(a);
                const st = activityStatus(a.status);
                const isSel = selected === a.id;
                return (
                  <div key={a.id} className="group absolute left-0 flex" style={{ top, height: ROW_H, width: totalW }}>
                    <div className={cn('sticky left-0 z-10 flex h-full shrink-0 items-center border-b border-r border-line/70 px-4 transition-colors', isSel ? 'bg-raised' : 'bg-surface group-hover:bg-raised')} style={{ width: labelW }}>
                      <Link href={`/activities/${a.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-ink transition-colors group-hover:text-accent">{a.name}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-[1px]" style={{ background: colorOf[a.contractor_id ?? ''] }} />
                          <span className="num text-[10px] text-faint">{a.progress}%</span>
                          {a.is_critical && <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-critical">crit</span>}
                          {a.status === 'delayed' && <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-critical">delayed</span>}
                        </span>
                      </Link>
                    </div>
                    <div className={cn('relative h-full border-b border-line/50 transition-colors', isSel ? 'bg-accent/[0.05]' : 'group-hover:bg-ink/[0.02]')} style={{ width: gridW }}>
                      {showBaseline && a.baseline_start && a.baseline_end && (
                        <span aria-hidden className="absolute h-[3px] rounded-full bg-ink/25 transition-[left,width,opacity] duration-swoop ease-swoop"
                          style={{ left: xOf(a.baseline_start), width: Math.max(4, xOf(a.baseline_end) - xOf(a.baseline_start)), top: ROW_H - 9, opacity: dim ? 0.25 : 1 }} />
                      )}
                      <button
                        aria-label={`${a.name}: ${fmtDate(a.start_date)} to ${fmtDate(a.end_date)}, ${a.progress}% complete, ${st.label}`}
                        onClick={() => { if (!drag.current?.moved) setSelected(isSel ? null : a.id); }}
                        onDoubleClick={() => router.push(`/activities/${a.id}`)}
                        onMouseEnter={e => setHover({ id: a.id, x: e.clientX, y: e.clientY })}
                        onMouseMove={e => setHover({ id: a.id, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setSelected(a.id)}
                        className={cn('absolute overflow-hidden rounded-[5px] transition-[left,width,opacity,box-shadow,transform] duration-swoop ease-swoop hover:-translate-y-px hover:shadow-e2',
                          isSel && 'ring-2 ring-accent ring-offset-1 ring-offset-surface')}
                        style={{
                          left: bx, width: bw, top: 9, height: 18, opacity: dim ? 0.22 : 1,
                          boxShadow: showCritical && a.is_critical ? `0 0 0 1.5px ${toneColor.critical}` : undefined,
                        }}>
                        <span className="absolute inset-0" style={{ background: color, opacity: 0.22 }} />
                        <span className="absolute inset-y-0 left-0 transition-[width] duration-cinematic ease-swoop" style={{ width: `${Math.max(0, Math.min(100, a.progress))}%`, background: color }} />
                        {a.status === 'delayed' && <span className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(135deg, transparent 0 4px, ${toneColor.critical} 4px 5.5px)`, opacity: 0.55 }} />}
                        {bw > 46 && <span className="num absolute inset-0 flex items-center px-2 text-[9.5px] font-medium" style={{ color: a.progress > 55 ? '#fff' : 'rgb(var(--c-ink))', mixBlendMode: a.progress > 55 ? undefined : 'normal' }}>{a.progress}%</span>}
                      </button>
                      {zoom !== 'year' && bw + bx + 8 < gridW - 160 && (
                        <span className="pointer-events-none absolute top-[11px] hidden truncate text-[11px] text-muted lg:block" style={{ left: bx + bw + 8, maxWidth: 220, opacity: dim ? 0.3 : 1 }}>{a.name}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hov && hover && (
            <motion.div key="tip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
              className="pointer-events-none fixed z-[100] w-[250px] rounded-card border border-line bg-raised p-3 shadow-e4"
              style={{ left: Math.min(hover.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 266), top: hover.y + 16 }}>
              <div className="text-[12.5px] font-medium leading-snug text-ink">{hov.name}</div>
              <div className="mt-1 text-[11px] text-muted">{nameOf[hov.contractor_id ?? ''] ?? 'Unassigned'}</div>
              <div className="num mt-2 text-[11px] text-ink-2">{fmtDate(hov.start_date, { day: 'numeric', month: 'short', year: '2-digit' })} → {fmtDate(hov.end_date, { day: 'numeric', month: 'short', year: '2-digit' })} · {daysBetween(hov.start_date, hov.end_date)}d</div>
              <ProgressBar className="mt-2.5" value={hov.progress} height={3} tone={barColor(hov)} />
              <div className="mt-2 flex items-center gap-1.5"><Badge tone={activityStatus(hov.status).tone}>{activityStatus(hov.status).label}</Badge>{hov.is_critical && <Badge tone="critical">critical</Badge>}<span className="num ml-auto text-[11px] text-ink">{hov.progress}%</span></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected activity — docked detail */}
        <AnimatePresence>
          {sel && (
            <motion.div key={sel.id} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1, transition: spring.panel }} exit={{ y: 24, opacity: 0, transition: { duration: 0.18 } }}
              className="absolute bottom-3 left-3 right-3 z-30 rounded-card border border-line bg-raised/95 p-4 shadow-e4 backdrop-blur sm:left-auto sm:w-[400px]">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-[3px]" style={{ background: barColor(sel) }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium leading-snug text-ink">{sel.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">{nameOf[sel.contractor_id ?? ''] ?? 'Unassigned'}</div>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Clear selection" className="rounded p-1 text-faint hover:text-ink"><X size={14} /></button>
              </div>
              <dl className="num mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div><dt className="text-faint">Start</dt><dd className="text-ink-2">{fmtDate(sel.start_date, { day: 'numeric', month: 'short', year: '2-digit' })}</dd></div>
                <div><dt className="text-faint">Finish</dt><dd className="text-ink-2">{fmtDate(sel.end_date, { day: 'numeric', month: 'short', year: '2-digit' })}</dd></div>
                <div><dt className="text-faint">Duration</dt><dd className="text-ink-2">{daysBetween(sel.start_date, sel.end_date)} days</dd></div>
              </dl>
              {(() => {
                const pre = deps.filter(d => d.successor_id === sel.id).map(d => byId.get(d.predecessor_id)?.name).filter(Boolean);
                const suc = deps.filter(d => d.predecessor_id === sel.id).map(d => byId.get(d.successor_id)?.name).filter(Boolean);
                return (pre.length + suc.length) > 0 && (
                  <div className="mt-3 space-y-1 text-[11.5px]">
                    {pre.length > 0 && <div className="text-muted">After: <span className="text-ink-2">{pre.join(' · ')}</span></div>}
                    {suc.length > 0 && <div className="text-muted">Before: <span className="text-ink-2">{suc.join(' · ')}</span></div>}
                  </div>
                );
              })()}
              <div className="mt-3 flex items-center gap-2">
                <ProgressBar value={sel.progress} height={3} tone={barColor(sel)} className="flex-1" />
                <span className="num text-[11px] text-ink">{sel.progress}%</span>
                <Button size="xs" variant="primary" iconRight={<ArrowUpRight size={12} />} onClick={() => router.push(`/activities/${sel.id}`)}>Open</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-[11.5px] text-faint">
        Drag or scroll to move through time · click a bar to trace its dependencies · double-click or “Open” for full detail.
        Thin line = baseline; filled portion = progress; hatching = delayed.
      </p>
    </div>
  );
}
