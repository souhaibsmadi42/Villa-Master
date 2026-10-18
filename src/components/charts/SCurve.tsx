'use client';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ease } from '@/motion/tokens';

type Point = { label: string; planned: number; earned?: number | null };

/**
 * Planned-vs-earned S-curve. Hand-drawn SVG (no chart library): the planned curve
 * draws in, recorded snapshots plot as an earned line, "today" is marked with the
 * live earned value. Hover or focus to read any month.
 */
export function SCurve({ data, todayLabel, todayPlanned, todayActual, height = 260 }: {
  data: Point[]; todayLabel?: string; todayPlanned?: number; todayActual?: number; height?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { l: 36, r: 12, t: 16, b: 26 };
  const iw = w - pad.l - pad.r, ih = height - pad.t - pad.b;
  const n = Math.max(1, data.length - 1);
  const X = (i: number) => pad.l + (i / n) * iw;
  const Y = (v: number) => pad.t + ih - (v / 100) * ih;

  const { plannedPath, areaPath, earnedPath } = useMemo(() => {
    const pts = data.map((d, i) => [X(i), Y(d.planned)] as const);
    const smooth = (p: readonly (readonly [number, number])[]) => p.reduce((acc, [x, y], i) => {
      if (i === 0) return `M${x},${y}`;
      const [px, py] = p[i - 1]; const cx = (px + x) / 2;
      return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
    }, '');
    const plannedPath = smooth(pts);
    const areaPath = pts.length ? `${plannedPath} L${pts[pts.length - 1][0]},${Y(0)} L${pts[0][0]},${Y(0)} Z` : '';
    const e = data.map((d, i) => (d.earned != null ? [X(i), Y(d.earned)] as const : null)).filter(Boolean) as [number, number][];
    return { plannedPath, areaPath, earnedPath: e.length > 1 ? smooth(e) : '' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, w, height]);

  const todayIdx = todayLabel ? data.findIndex(d => d.label === todayLabel) : -1;
  const every = Math.ceil(data.length / Math.max(4, Math.floor(iw / 64)));
  const h = hover != null ? data[hover] : null;

  if (!data.length) return <div className="grid h-[200px] place-items-center text-[12.5px] text-muted">No scheduled activities to plot.</div>;

  return (
    <div ref={wrap} className="relative w-full select-none" style={{ height }}>
      <svg width={w} height={height} role="img" aria-label={`Progress S-curve. Planned ${todayPlanned ?? '—'}% by today, earned ${todayActual ?? '—'}%.`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={e => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const i = Math.round(((e.clientX - r.left - pad.l) / iw) * n); setHover(Math.max(0, Math.min(n, i))); }}>
        <defs>
          <linearGradient id="sc-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'rgb(var(--c-olive))', stopOpacity: 0.22 }} />
            <stop offset="1" style={{ stopColor: 'rgb(var(--c-olive))', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={Y(v)} y2={Y(v)} style={{ stroke: 'rgb(var(--c-ink))', strokeOpacity: v === 0 ? 0.18 : 0.06 }} />
            <text x={pad.l - 8} y={Y(v) + 3.5} textAnchor="end" className="num" style={{ fontSize: 10, fill: 'rgb(var(--c-faint))' }}>{v}</text>
          </g>
        ))}
        {data.map((d, i) => (i % every === 0 || i === n) && (
          <text key={i} x={X(i)} y={height - 8} textAnchor={i === n ? 'end' : i === 0 ? 'start' : 'middle'} className="num" style={{ fontSize: 10, fill: 'rgb(var(--c-faint))' }}>{d.label}</text>
        ))}
        <motion.path d={areaPath} fill="url(#sc-area)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.4 }} />
        <motion.path d={plannedPath} fill="none" style={{ stroke: 'rgb(var(--c-olive))' }} strokeWidth={1.6}
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, ease: ease.swoop }} />
        {earnedPath && (
          <motion.path d={earnedPath} fill="none" style={{ stroke: 'rgb(var(--c-accent))' }} strokeWidth={2.2}
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, delay: 0.5, ease: ease.swoop }} />
        )}
        {todayIdx >= 0 && (
          <g>
            <line x1={X(todayIdx)} x2={X(todayIdx)} y1={pad.t} y2={Y(0)} style={{ stroke: 'rgb(var(--c-critical))', strokeOpacity: 0.7 }} strokeDasharray="3 3" />
            <text x={X(todayIdx) + 5} y={pad.t + 9} className="num" style={{ fontSize: 9.5, fill: 'rgb(var(--c-critical))', letterSpacing: '0.1em' }}>TODAY</text>
            {todayActual != null && (
              <motion.circle cx={X(todayIdx)} cy={Y(todayActual)} r={4.5} style={{ fill: 'rgb(var(--c-accent))', stroke: 'rgb(var(--c-surface))' }} strokeWidth={2}
                initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 1.3, type: 'spring', stiffness: 400, damping: 20 }} />
            )}
          </g>
        )}
        {h && hover != null && (
          <g pointerEvents="none">
            <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={Y(0)} style={{ stroke: 'rgb(var(--c-ink))', strokeOpacity: 0.25 }} />
            <circle cx={X(hover)} cy={Y(h.planned)} r={3.5} style={{ fill: 'rgb(var(--c-olive))' }} />
          </g>
        )}
      </svg>
      {h && hover != null && (
        <div className="pointer-events-none absolute top-2 rounded-[8px] border border-line bg-raised px-3 py-2 shadow-e3"
          style={{ left: Math.min(Math.max(X(hover) + 10, 0), w - 150) }}>
          <div className="num text-[10.5px] text-faint">{h.label}</div>
          <div className="mt-0.5 text-[12px] text-ink">Planned <span className="num">{h.planned}%</span></div>
          {h.earned != null && <div className="text-[12px] text-accent">Earned <span className="num">{h.earned}%</span></div>}
        </div>
      )}
      <div className="absolute -bottom-7 left-0 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-2"><span className="h-[2px] w-4 bg-olive" /> Planned cumulative</span>
        {earnedPath && <span className="inline-flex items-center gap-2"><span className="h-[2px] w-4 bg-accent" /> Earned (recorded snapshots)</span>}
        {todayActual != null && <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent" /> Earned today <span className="num">{todayActual}%</span></span>}
        {todayPlanned != null && <span className="num text-faint">planned by today {todayPlanned}%</span>}
      </div>
    </div>
  );
}
