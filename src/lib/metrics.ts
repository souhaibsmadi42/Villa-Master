// Pure schedule/earned-value math. Server-safe (no React, no DB).

export type ActivityLite = {
  start_date: string; end_date: string;
  baseline_start: string | null; baseline_end: string | null;
  progress: number; weight: number; status: string;
};
export type CostLite = { budget: number; actual_cost: number };

const DAY = 86400000;
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/** Planned % complete of one activity at a given date (linear over its baseline span). */
function plannedFrac(a: ActivityLite, at: number) {
  const s = +new Date(a.baseline_start ?? a.start_date);
  const e = +new Date(a.baseline_end ?? a.end_date);
  if (e <= s) return at >= e ? 1 : 0;
  return clamp((at - s) / (e - s));
}

/** Weighted planned % across the whole programme at a date. */
export function plannedAt(acts: ActivityLite[], at: number) {
  const W = acts.reduce((s, a) => s + (a.weight || 1), 0) || 1;
  const v = acts.reduce((s, a) => s + (a.weight || 1) * plannedFrac(a, at), 0);
  return (v / W) * 100;
}

/** Weighted earned (actual) % across the programme right now. */
export function earnedNow(acts: ActivityLite[]) {
  const W = acts.reduce((s, a) => s + (a.weight || 1), 0) || 1;
  const v = acts.reduce((s, a) => s + (a.weight || 1) * (a.progress / 100), 0);
  return (v / W) * 100;
}

export interface Metrics {
  progress: number;        // earned %
  plannedToday: number;    // planned % by today
  spi: number;             // earned / planned
  cpi: number | null;      // earned-value / actual-cost (null if no cost data)
  health: number;          // 0..100 blended
  delayed: number;
  total: number;
}

export function computeMetrics(acts: ActivityLite[], costs: CostLite[] = [], now = Date.now()): Metrics {
  const progress = earnedNow(acts);
  const plannedToday = plannedAt(acts, now);
  const spi = plannedToday > 0 ? progress / plannedToday : 1;
  const delayed = acts.filter(a => a.status === 'delayed').length;
  const total = acts.length;

  const BAC = costs.reduce((s, c) => s + (c.budget || 0), 0);
  const AC = costs.reduce((s, c) => s + (c.actual_cost || 0), 0);
  const EVcost = BAC * (progress / 100);
  const cpi = AC > 0 ? EVcost / AC : null;

  const onTime = total ? 1 - delayed / total : 1;
  const health = Math.round(100 * (0.5 * clamp(spi, 0, 1) + 0.3 * onTime + 0.2 * clamp(progress / 100, 0, 1)));
  return { progress: Math.round(progress), plannedToday: Math.round(plannedToday), spi: +spi.toFixed(2), cpi: cpi ? +cpi.toFixed(2) : null, health, delayed, total };
}

/** Monthly cumulative planned-% series for the S-curve. */
export function sCurve(acts: ActivityLite[]) {
  if (!acts.length) return [] as { label: string; planned: number }[];
  let lo = Infinity, hi = -Infinity;
  for (const a of acts) { lo = Math.min(lo, +new Date(a.baseline_start ?? a.start_date)); hi = Math.max(hi, +new Date(a.baseline_end ?? a.end_date)); }
  const out: { label: string; planned: number }[] = [];
  const d = new Date(lo); d.setDate(1);
  while (+d <= hi + 31 * DAY) {
    out.push({ label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), planned: Math.round(plannedAt(acts, +d)) });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}
