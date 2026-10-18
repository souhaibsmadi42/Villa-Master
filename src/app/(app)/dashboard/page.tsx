import Link from 'next/link';
import { ArrowUpRight, AlertTriangle, Clock, FileCheck2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { computeMetrics, sCurve, type ActivityLite, type CostLite } from '@/lib/metrics';
import { currentPhase, programmeWeek, healthLabel, type StageLite } from '@/lib/project-data';
import { fmtDate, relDays, daysBetween } from '@/lib/format';
import { isAwaitingDecision, isClosedDeliverable, toneColor, deliverableStatus } from '@/lib/status';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Ring } from '@/components/ui/Ring';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Controls';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/marketing/Reveal';
import { SCurve } from '@/components/charts/SCurve';
import { LiveFeed } from '@/components/dashboard/LiveFeed';
import { SitePanel, type BuildingProgress } from '@/components/dashboard/SitePanel';
import { InsightNote } from '@/components/dashboard/InsightNote';
import { AskButton } from '@/components/assistant/AskButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Overview' };

type Act = ActivityLite & { id: string; name: string; stage_id: string | null; contractor_id: string | null; building_id: string | null; is_critical: boolean };
type Del = { id: string; name: string; status: string; priority: string; due_date: string | null; activity_id: string; contractor_id: string | null };

export default async function DashboardPage() {
  const profile = await getSessionProfile();
  const sb = await createClient();

  const [{ data: project }, { data: activities }, { data: stages }, { data: deliverables }, { data: milestones }, { data: costs }, { data: events }, { data: snaps }, { data: contractors }, { data: buildings }] = await Promise.all([
    sb.from('project').select('*').limit(1).maybeSingle(),
    sb.from('activity').select('id,name,stage_id,contractor_id,building_id,start_date,end_date,baseline_start,baseline_end,progress,weight,status,is_critical'),
    sb.from('stage').select('id,name,ord').order('ord'),
    sb.from('deliverable').select('id,name,status,priority,due_date,activity_id,contractor_id'),
    sb.from('milestone').select('name,planned_date,actual_date,status').order('ord'),
    sb.from('cost_line').select('budget,actual_cost'),
    sb.from('event_log').select('actor_name,verb,subject_text,subject_type,at').order('at', { ascending: false }).limit(8),
    sb.from('progress_snapshot').select('at,earned').order('at'),
    sb.from('contractor').select('id,name,color'),
    sb.from('building').select('id,key,name'),
  ]);

  const acts = (activities ?? []) as Act[];
  const dels = (deliverables ?? []) as Del[];
  const costRows = (costs ?? []) as CostLite[];
  const m = computeMetrics(acts, costRows);
  const health = healthLabel(m);
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const wk = programmeWeek(project?.start_date, project?.end_date);
  const phase = currentPhase((stages ?? []) as StageLite[], acts);
  const cName = (id: string | null) => contractors?.find(c => c.id === id)?.name ?? '—';

  // S-curve with recorded snapshots as the earned line
  const label = (d: string | number) => new Date(d).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  const earnedByLabel: Record<string, number> = {};
  for (const s of snaps ?? []) earnedByLabel[label(s.at)] = Number(s.earned);
  const series = sCurve(acts).map(p => ({ ...p, earned: earnedByLabel[p.label] ?? null }));

  // Building progress (weighted by activity weight)
  const bp: BuildingProgress[] = (buildings ?? []).map(b => {
    const own = acts.filter(a => a.building_id === b.id);
    const bm = own.length ? computeMetrics(own) : null;
    return { key: b.key, name: b.name, progress: bm?.progress ?? 0, activities: own.length, delayed: bm?.delayed ?? 0 };
  });

  // Next actions
  const plannedPct = (a: Act) => {
    const s = +new Date(a.baseline_start ?? a.start_date), e = +new Date(a.baseline_end ?? a.end_date);
    return e <= s ? (now >= e ? 100 : 0) : Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100));
  };
  const behind = acts.filter(a => a.status !== 'done' && (a.status === 'delayed' || plannedPct(a) - a.progress >= 15))
    .map(a => ({ a, gap: Math.round(plannedPct(a) - a.progress) }))
    .sort((x, y) => Number(y.a.is_critical) - Number(x.a.is_critical) || y.gap - x.gap);
  const awaiting = dels.filter(d => isAwaitingDecision(d.status));
  const overdue = dels.filter(d => d.due_date && d.due_date < today && !isClosedDeliverable(d.status));
  const dueSoon = dels.filter(d => d.due_date && d.due_date >= today && daysBetween(today, d.due_date) <= 14 && !isClosedDeliverable(d.status));

  const upcomingMs = (milestones ?? []).filter(x => x.status !== 'achieved');
  const nextMs = upcomingMs[0];
  const achievedMs = (milestones ?? []).filter(x => x.status === 'achieved').length;

  const perf = (contractors ?? []).map(c => {
    const own = acts.filter(a => a.contractor_id === c.id);
    if (!own.length) return null;
    const cm = computeMetrics(own);
    return { id: c.id, name: c.name, color: c.color, earned: cm.progress, planned: cm.plannedToday, delayed: cm.delayed, count: own.length };
  }).filter(Boolean) as { id: string; name: string; color: string; earned: number; planned: number; delayed: number; count: number }[];

  const budget = costRows.reduce((s, c) => s + (Number(c.budget) || 0), 0);
  const spent = costRows.reduce((s, c) => s + (Number(c.actual_cost) || 0), 0);
  const gap = m.progress - m.plannedToday;

  if (!acts.length) {
    return (
      <Panel className="mt-6">
        <EmptyState title="No programme data visible yet"
          body={<>If this is a new deployment, seed the database (<code className="num">npm run seed</code> or <code className="num">/api/seed</code>). Contractors only see activities in their own scope.</>} />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Editorial header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <span className="h-px w-4 bg-current opacity-50" />
            Overview{wk ? (wk.startsIn ? <> · Starts in <span className="text-ink">{wk.startsIn}</span> {wk.startsIn === 1 ? 'day' : 'days'}</> : <> · Week <span className="text-ink">{wk.week}</span>{wk.total ? ` of ${wk.total}` : ''}</>) : null}
            {profile?.role === 'contractor' && ' · your scope'}
          </div>
          <h1 className="display mt-3 text-[clamp(40px,6vw,76px)] text-ink">
            {project?.name ?? 'Villa Ajloun'}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-muted">
            {phase && <span className="text-ink-2">Now: <em className="display text-[17px] italic text-accent">{phase}</em></span>}
            {project?.location && <><span className="text-faint">·</span><span>{project.location}</span></>}
            {project && <><span className="text-faint">·</span><span className="num text-[12px]">{fmtDate(project.start_date)} → {fmtDate(project.end_date)}</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AskButton prompt="Give me a short briefing for this week: progress against plan, what is behind and why it matters, and the decisions waiting on us.">Brief me on this week</AskButton>
          <ButtonLink href="/timeline" size="sm" variant="primary" iconRight={<ArrowUpRight size={14} />}>Open timeline</ButtonLink>
        </div>
      </header>

      {/* Dominant feature + completion */}
      <section className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <SitePanel buildings={bp} />
        <Panel className="flex flex-col p-6">
          <PanelHeader label="Completion" meta={`${m.total} activities`} />
          <div className="mt-5 flex items-center gap-6">
            <Ring value={m.progress / 100} marker={m.plannedToday / 100} size={128} stroke={7} label="earned" />
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[12px] text-muted">Planned by today</div>
                <div className="num text-[18px] text-ink">{m.plannedToday}%</div>
              </div>
              <div>
                <div className="text-[12px] text-muted">Against plan</div>
                <div className="num text-[18px]" style={{ color: gap >= 0 ? toneColor.success : gap > -5 ? toneColor.warning : toneColor.critical }}>
                  {gap >= 0 ? '+' : '−'}{Math.abs(gap)} pts
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line">
            <div className="bg-surface p-4">
              <div className="eyebrow text-[9.5px]">Schedule</div>
              <div className="mt-2 flex items-baseline gap-2">
                <AnimatedNumber value={m.spi} decimals={2} className="display text-[34px] leading-none text-ink" />
                <span className="text-[11px] text-muted">SPI</span>
              </div>
              <div className="mt-1.5 text-[11.5px] text-muted">{m.spi >= 1 ? 'At or ahead of plan' : `${Math.round((1 - m.spi) * 100)}% less work done than planned`}</div>
            </div>
            <div className="bg-surface p-4">
              <div className="eyebrow text-[9.5px]">Health</div>
              <div className="mt-2 flex items-baseline gap-2">
                <AnimatedNumber value={m.health} className="display text-[34px] leading-none text-ink" />
                <span className="text-[11px] text-muted">/ 100</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]" style={{ color: toneColor[health.tone] }}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />{health.label}
              </div>
            </div>
          </div>
          {budget > 0 && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-muted">Cost to date</span>
                <span className="num text-ink-2">{spent.toLocaleString()} / {budget.toLocaleString()} {project?.currency}</span>
              </div>
              <ProgressBar value={(spent / budget) * 100} marker={m.progress} className="mt-2" />
              <div className="mt-1.5 text-[11px] text-faint">Marker shows earned progress · CPI {m.cpi ?? '—'}</div>
            </div>
          )}
          <p className="mt-auto pt-5 text-[11px] leading-relaxed text-faint">Earned = weighted activity progress. SPI = earned ÷ planned-by-today. Health blends SPI, on-time ratio and progress.</p>
        </Panel>
      </section>

      {/* Next actions + milestones */}
      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Reveal>
          <Panel className="p-6">
            <PanelHeader label="Needs attention" meta={behind.length + awaiting.length + overdue.length}
              action={<Link href="/deliverables" className="text-[12px] text-muted hover:text-ink">All deliverables →</Link>} />
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { n: behind.length, l: 'Behind plan', icon: AlertTriangle, tone: 'critical' as const, href: '/timeline' },
                { n: awaiting.length, l: 'Awaiting decision', icon: FileCheck2, tone: 'warning' as const, href: '/deliverables?status=awaiting' },
                { n: overdue.length, l: 'Overdue', icon: Clock, tone: 'critical' as const, href: '/deliverables?status=overdue' },
              ].map(k => (
                <Link key={k.l} href={k.href} className="group rounded-card border border-line bg-raised/50 p-3.5 transition hover:border-line-strong hover:bg-raised">
                  <k.icon size={14} style={{ color: k.n ? toneColor[k.tone] : 'rgb(var(--c-faint))' }} />
                  <div className="display mt-3 text-[30px] leading-none text-ink"><AnimatedNumber value={k.n} /></div>
                  <div className="mt-1 text-[11.5px] text-muted group-hover:text-ink-2">{k.l}</div>
                </Link>
              ))}
            </div>
            <ul className="mt-5 divide-y divide-line border-t border-line">
              {behind.slice(0, 4).map(({ a, gap: g }) => (
                <li key={a.id}>
                  <Link href={`/activities/${a.id}`} className="group flex items-center gap-3 py-3 transition-colors">
                    <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: a.status === 'delayed' ? toneColor.critical : toneColor.warning }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink group-hover:text-accent">{a.name}</span>
                      <span className="text-[11.5px] text-muted">{cName(a.contractor_id)} · {a.progress}% done{g > 0 ? `, ${g} pts behind plan` : ''}</span>
                    </span>
                    {a.is_critical && <Badge tone="critical">critical</Badge>}
                    <Badge tone={a.status === 'delayed' ? 'critical' : 'warning'}>{a.status === 'delayed' ? 'delayed' : 'behind'}</Badge>
                  </Link>
                </li>
              ))}
              {[...overdue, ...awaiting].slice(0, 4).map(d => {
                const st = deliverableStatus(d.status);
                const late = d.due_date && d.due_date < today && !isClosedDeliverable(d.status);
                return (
                  <li key={d.id}>
                    <Link href={`/deliverables?focus=${d.id}`} className="group flex items-center gap-3 py-3">
                      <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: late ? toneColor.critical : toneColor.warning }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink group-hover:text-accent">{d.name}</span>
                        <span className="text-[11.5px] text-muted">{cName(d.contractor_id)}{d.due_date ? ` · due ${fmtDate(d.due_date, { day: 'numeric', month: 'short' })} (${relDays(d.due_date)})` : ''}</span>
                      </span>
                      {late ? <Badge tone="critical">overdue</Badge> : <Badge tone={st.tone}>{st.label}</Badge>}
                    </Link>
                  </li>
                );
              })}
              {behind.length + awaiting.length + overdue.length === 0 && (
                <li><EmptyState compact title="Nothing needs attention" body="No activity is behind plan and no deliverable is overdue or awaiting a decision." /></li>
              )}
            </ul>
            {dueSoon.length > 0 && <p className="mt-3 text-[11.5px] text-muted"><span className="num text-ink">{dueSoon.length}</span> more deliverable{dueSoon.length === 1 ? '' : 's'} due in the next 14 days.</p>}
          </Panel>
        </Reveal>

        <Reveal delay={0.08}>
          <Panel className="h-full p-6">
            <PanelHeader label="Milestones" meta={`${achievedMs} / ${(milestones ?? []).length} achieved`}
              action={<Link href="/milestones" className="text-[12px] text-muted hover:text-ink">Manage →</Link>} />
            {nextMs && (
              <div className="mt-5 rounded-card bg-primary p-5 text-on-primary">
                <div className="eyebrow text-on-primary/60">Next milestone</div>
                <div className="display mt-2 text-[26px] leading-tight">{nextMs.name}</div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="num text-[12px] opacity-70">{fmtDate(nextMs.planned_date)}</span>
                  {nextMs.planned_date && (
                    <span className="num text-[13px]">{daysBetween(today, nextMs.planned_date) >= 0 ? `${daysBetween(today, nextMs.planned_date)} days` : `${-daysBetween(today, nextMs.planned_date)} days late`}</span>
                  )}
                </div>
              </div>
            )}
            <ol className="relative mt-5 flex flex-col">
              <span aria-hidden className="absolute bottom-3 left-[4.5px] top-3 w-px bg-line" />
              {(milestones ?? []).map(ms => {
                const done = ms.status === 'achieved';
                const late = !done && ms.planned_date && ms.planned_date < today;
                return (
                  <li key={ms.name} className="relative flex items-center gap-4 py-2">
                    <span className={`relative z-[1] h-2.5 w-2.5 rotate-45 border ${done ? 'border-success bg-success' : late ? 'border-critical bg-canvas' : 'border-line-strong bg-canvas'}`} />
                    <span className={`flex-1 text-[12.5px] ${done ? 'text-muted line-through decoration-line-strong' : 'text-ink'}`}>{ms.name}</span>
                    <span className="num text-[10.5px] text-faint">{fmtDate(ms.actual_date || ms.planned_date, { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </Reveal>
      </section>

      {/* S-curve */}
      <Reveal>
        <Panel className="p-6 pb-12">
          <PanelHeader label="Progress — planned vs earned" meta="cumulative %" />
          <div className="mt-5"><SCurve data={series} todayLabel={label(now)} todayPlanned={m.plannedToday} todayActual={m.progress} /></div>
        </Panel>
      </Reveal>

      {/* Contractors · insight · feed */}
      <section className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-1">
          <Panel className="h-full p-6">
            <PanelHeader label="Contractor progress" action={profile?.role !== 'contractor' ? <Link href="/contractors" className="text-[12px] text-muted hover:text-ink">All →</Link> : undefined} />
            <ul className="mt-5 flex flex-col gap-4">
              {perf.map(p => (
                <li key={p.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink">
                      <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="num shrink-0 text-[11px] text-muted">{p.earned}% <span className="text-faint">/ {p.planned}%</span></span>
                  </div>
                  <ProgressBar className="mt-2" value={p.earned} marker={p.planned} height={3}
                    tone={p.earned + 5 < p.planned ? toneColor.warning : 'rgb(var(--c-ink))'} />
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[11px] text-faint">Bar = earned · tick = planned by today</p>
          </Panel>
        </Reveal>
        <Reveal delay={0.06}>
          <Panel className="h-full p-6">
            <PanelHeader label="Insights" meta="computed from live data" />
            <ul className="mt-5 flex flex-col gap-3.5 text-[13px] leading-relaxed text-ink-2">
              <li>Earned <b className="font-medium text-ink">{m.progress}%</b> against <b className="font-medium text-ink">{m.plannedToday}%</b> planned — SPI <span className="num">{m.spi.toFixed(2)}</span>.</li>
              {behind[0] && <li><b className="font-medium text-ink">{behind[0].a.name}</b> is furthest behind{behind[0].gap > 0 ? ` (${behind[0].gap} pts)` : ''}{behind[0].a.is_critical ? ', on the critical path' : ''}.</li>}
              {nextMs?.planned_date && <li>Next milestone, <b className="font-medium text-ink">{nextMs.name}</b>, is {relDays(nextMs.planned_date)}.</li>}
              <li>{dueSoon.length} deliverable{dueSoon.length === 1 ? '' : 's'} due within 14 days; {awaiting.length} awaiting a decision.</li>
            </ul>
            <div className="mt-5"><InsightNote /></div>
          </Panel>
        </Reveal>
        <Reveal delay={0.12}>
          <Panel className="h-full p-6">
            <PanelHeader label="Recent activity" />
            <div className="mt-2"><LiveFeed initial={events ?? []} /></div>
          </Panel>
        </Reveal>
      </section>
    </div>
  );
}
