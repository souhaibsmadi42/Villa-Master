import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { computeMetrics, type ActivityLite, type CostLite, type Metrics } from '@/lib/metrics';
import { isAwaitingDecision, isClosedDeliverable } from '@/lib/status';

// Shared server-side reads. Every query runs with the signed-in user's session,
// so RLS decides what is visible (a contractor sees only their scope).

const DAY = 86400000;

export type StageLite = { id: string; name: string; ord: number };
type PhaseActivity = ActivityLite & { stage_id: string | null };

export function programmeWeek(start: string | null | undefined, end: string | null | undefined, now = Date.now()) {
  if (!start) return null;
  const s = +new Date(start), e = end ? +new Date(end) : null;
  return {
    week: Math.max(0, Math.floor((now - s) / (7 * DAY)) + 1),
    total: e ? Math.ceil((e - s) / (7 * DAY)) : null,
  };
}

/** The stage carrying the most weight of work scheduled for today; else the next stage to start. */
export function currentPhase(stages: StageLite[], acts: PhaseActivity[], now = Date.now()) {
  const byStage = new Map<string, number>();
  for (const a of acts) {
    if (!a.stage_id || a.status === 'done') continue;
    if (+new Date(a.start_date) <= now && +new Date(a.end_date) >= now) byStage.set(a.stage_id, (byStage.get(a.stage_id) ?? 0) + (a.weight || 1));
  }
  let best: string | null = null, w = -1;
  byStage.forEach((v, k) => { if (v > w) { w = v; best = k; } });
  if (best) return stages.find(s => s.id === best)?.name ?? null;
  const upcoming = acts.filter(a => a.stage_id && +new Date(a.start_date) > now).sort((a, b) => +new Date(a.start_date) - +new Date(b.start_date))[0];
  if (upcoming) return stages.find(s => s.id === upcoming.stage_id)?.name ?? null;
  return acts.length && acts.every(a => a.status === 'done') ? 'Complete' : null;
}

export function healthLabel(m: Metrics) {
  if (!m.total) return { label: 'No data', tone: 'neutral' as const };
  if (m.health >= 80) return { label: 'On track', tone: 'success' as const };
  if (m.health >= 60) return { label: 'Watch', tone: 'warning' as const };
  return { label: 'At risk', tone: 'critical' as const };
}

export type ShellEvent = { actor_name: string | null; verb: string; subject_text: string | null; subject_type: string | null; at: string };

export type ShellSummary = {
  projectName: string;
  location: string | null;
  metrics: Metrics | null;
  health: ReturnType<typeof healthLabel>;
  phase: string | null;
  week: ReturnType<typeof programmeWeek>;
  awaitingDecision: number;
  overdue: number;
  events: ShellEvent[];
};

/** Compact, real project status for the floating status bar. Never throws. */
export async function getShellSummary(): Promise<ShellSummary> {
  const empty: ShellSummary = { projectName: 'Villa Ajloun', location: null, metrics: null, health: { label: 'No data', tone: 'neutral' }, phase: null, week: null, awaitingDecision: 0, overdue: 0, events: [] };
  try {
    const sb = await createClient();
    const [{ data: project }, { data: acts }, { data: stages }, { data: dels }, { data: events }] = await Promise.all([
      sb.from('project').select('name,location,start_date,end_date').limit(1).maybeSingle(),
      sb.from('activity').select('stage_id,start_date,end_date,baseline_start,baseline_end,progress,weight,status'),
      sb.from('stage').select('id,name,ord').order('ord'),
      sb.from('deliverable').select('status,due_date'),
      sb.from('event_log').select('actor_name,verb,subject_text,subject_type,at').order('at', { ascending: false }).limit(8),
    ]);
    const a = (acts ?? []) as PhaseActivity[];
    const m = a.length ? computeMetrics(a) : null;
    const today = new Date().toISOString().slice(0, 10);
    const d = dels ?? [];
    return {
      projectName: project?.name ?? empty.projectName,
      location: project?.location ?? null,
      metrics: m,
      health: m ? healthLabel(m) : empty.health,
      phase: currentPhase((stages ?? []) as StageLite[], a),
      week: programmeWeek(project?.start_date, project?.end_date),
      awaitingDecision: d.filter(x => isAwaitingDecision(x.status)).length,
      overdue: d.filter(x => x.due_date && x.due_date < today && !isClosedDeliverable(x.status)).length,
      events: (events ?? []) as ShellEvent[],
    };
  } catch {
    return empty;
  }
}

type LiveActivity = PhaseActivity & { id: string; name: string; contractor_id: string | null; is_critical: boolean };
type LiveDeliverable = { name: string; status: string; priority: string; due_date: string | null; contractor_id: string | null };

/** Structured live project data for the assistant, read with the caller's session (RLS applies). */
export async function getLiveProjectData() {
  const sb = await createClient();
  const [{ data: project }, { data: acts }, { data: stages }, { data: contractors }, { data: dels }, { data: milestones }, { data: costs }, { data: events }, { data: deps }] = await Promise.all([
    sb.from('project').select('name,location,start_date,end_date,currency').limit(1).maybeSingle(),
    sb.from('activity').select('id,name,stage_id,contractor_id,start_date,end_date,baseline_start,baseline_end,progress,weight,status,is_critical'),
    sb.from('stage').select('id,name,ord').order('ord'),
    sb.from('contractor').select('id,name,scope'),
    sb.from('deliverable').select('name,status,priority,due_date,contractor_id'),
    sb.from('milestone').select('name,planned_date,actual_date,status').order('ord'),
    sb.from('cost_line').select('budget,actual_cost'),
    sb.from('event_log').select('actor_name,verb,subject_text,at').order('at', { ascending: false }).limit(10),
    sb.from('activity_dependency').select('predecessor_id,successor_id'),
  ]);

  const A = (acts ?? []) as LiveActivity[];
  const D = (dels ?? []) as LiveDeliverable[];
  const C = (contractors ?? []) as { id: string; name: string; scope: string | null }[];
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const plannedPct = (a: LiveActivity) => {
    const s = +new Date(a.baseline_start ?? a.start_date), e = +new Date(a.baseline_end ?? a.end_date);
    return e <= s ? (now >= e ? 100 : 0) : Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100));
  };

  return {
    today,
    project,
    metrics: computeMetrics(A, (costs ?? []) as CostLite[]),
    week: programmeWeek(project?.start_date, project?.end_date),
    phase: currentPhase((stages ?? []) as StageLite[], A),
    activities: A,
    contractors: C,
    deliverables: D,
    milestones: (milestones ?? []) as { name: string; planned_date: string | null; actual_date: string | null; status: string }[],
    events: (events ?? []) as { actor_name: string | null; verb: string; subject_text: string | null; at: string }[],
    deps: (deps ?? []) as { predecessor_id: string; successor_id: string }[],
    contractorName: (id: string | null) => C.find(c => c.id === id)?.name ?? 'Unassigned',
    active: A.filter(a => a.status !== 'done' && +new Date(a.start_date) <= now && +new Date(a.end_date) >= now),
    delayed: A.filter(a => a.status === 'delayed'),
    /** Not done and at least 15 points behind where the baseline says it should be today. */
    behind: A.filter(a => a.status !== 'done' && plannedPct(a) - a.progress >= 15).map(a => ({ a, gap: Math.round(plannedPct(a) - a.progress) })),
    awaiting: D.filter(d => isAwaitingDecision(d.status)),
    overdue: D.filter(d => d.due_date && d.due_date < today && !isClosedDeliverable(d.status)),
    upcoming: D.filter(d => d.due_date && d.due_date >= today && !isClosedDeliverable(d.status)).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)),
  };
}
export type LiveProjectData = Awaited<ReturnType<typeof getLiveProjectData>>;

/** Plain-text snapshot of the live data, compact enough for a system prompt. */
export function snapshotText(d: LiveProjectData) {
  const { project, metrics: m, week: wk, phase, contractorName: cName } = d;
  const fmt = (s: string | null | undefined) => s ?? 'no date';
  const perContractor = d.contractors.map(c => {
    const own = d.activities.filter(a => a.contractor_id === c.id);
    if (!own.length) return null;
    const cm = computeMetrics(own);
    const openD = d.deliverables.filter(x => x.contractor_id === c.id && !isClosedDeliverable(x.status)).length;
    return `- ${c.name}${c.scope ? ` (${c.scope})` : ''}: ${own.length} activities, ${cm.progress}% earned vs ${cm.plannedToday}% planned, ${cm.delayed} delayed, ${openD} open deliverables`;
  }).filter(Boolean) as string[];
  const late = [...new Set([...d.delayed, ...d.behind.map(b => b.a)])];

  return [
    `TODAY: ${d.today}`,
    `PROJECT: ${project?.name ?? 'Unknown'} — ${project?.location ?? ''}`,
    `Programme: ${fmt(project?.start_date)} → ${fmt(project?.end_date)}${wk ? ` · week ${wk.week}${wk.total ? ` of ${wk.total}` : ''}` : ''}${phase ? ` · current phase "${phase}"` : ''}.`,
    `Progress ${m.progress}% earned vs ${m.plannedToday}% planned by today · SPI ${m.spi} · health ${m.health}/100${m.cpi != null ? ` · CPI ${m.cpi}` : ' · no cost data recorded'}.`,
    `Activities visible: ${d.activities.length}. In progress today: ${d.active.length}. Marked delayed: ${d.delayed.length}. ≥15 points behind plan: ${d.behind.length}.`,
    '',
    'CONTRACTORS:', ...(perContractor.length ? perContractor : ['- none visible']),
    '',
    'DELAYED / BEHIND ACTIVITIES:', ...late.slice(0, 12).map(a => `- ${a.name} — ${cName(a.contractor_id)}, ${a.progress}% done, ends ${a.end_date}${a.is_critical ? ', CRITICAL PATH' : ''}`),
    ...(late.length === 0 ? ['- none'] : []),
    '',
    `DELIVERABLES: ${d.deliverables.length} total · ${d.awaiting.length} awaiting decision · ${d.overdue.length} overdue.`,
    ...d.awaiting.slice(0, 10).map(x => `- AWAITING: ${x.name} (${cName(x.contractor_id)}, ${x.status.replace('_', ' ')})`),
    ...d.overdue.slice(0, 10).map(x => `- OVERDUE: ${x.name} (${cName(x.contractor_id)}, due ${x.due_date}, ${x.status.replace('_', ' ')})`),
    ...d.upcoming.slice(0, 10).map(x => `- DUE ${x.due_date}: ${x.name} (${cName(x.contractor_id)}, ${x.priority} priority, ${x.status.replace('_', ' ')})`),
    '',
    'MILESTONES:', ...d.milestones.map(ms => `- ${ms.name}: planned ${fmt(ms.planned_date)}${ms.actual_date ? `, actual ${ms.actual_date}` : ''} (${ms.status})`),
    '',
    'RECENT ACTIVITY LOG:', ...(d.events.length ? d.events.map(e => `- ${e.at.slice(0, 10)} ${e.actor_name ?? 'Someone'} ${e.verb} ${e.subject_text ?? ''}`) : ['- none recorded']),
  ].join('\n');
}

export const snapshotCounts = (d: LiveProjectData) => ({ activities: d.activities.length, deliverables: d.deliverables.length, milestones: d.milestones.length });

/** Plain-text project snapshot for the AI assistant (kept for existing callers). */
export async function getLiveSnapshotText() {
  const d = await getLiveProjectData();
  return { text: snapshotText(d), counts: snapshotCounts(d) };
}
