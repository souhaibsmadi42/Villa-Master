import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { computeMetrics, sCurve, type ActivityLite } from '@/lib/metrics';
import { healthLabel, programmeWeek } from '@/lib/project-data';
import { fmtDate, relDays } from '@/lib/format';
import { toneColor, isAwaitingDecision } from '@/lib/status';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Ring } from '@/components/ui/Ring';
import { ProgressBar } from '@/components/ui/Controls';
import { EmptyState } from '@/components/ui/States';
import { Reveal } from '@/components/marketing/Reveal';
import { SCurve } from '@/components/charts/SCurve';
import { ApprovalRow } from '@/components/owner/ApprovalRow';
import { Elevation } from '@/components/scenes/Elevation';
import { AskButton } from '@/components/assistant/AskButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Owner view' };

export default async function OwnerPage() {
  const profile = await getSessionProfile();
  if (!profile || !['admin', 'owner'].includes(profile.role)) redirect('/dashboard');
  const sb = await createClient();

  const [{ data: project }, { data: activities }, { data: deliverables }, { data: milestones }, { data: costs }, { data: contractors }, { data: reports }] = await Promise.all([
    sb.from('project').select('*').limit(1).maybeSingle(),
    sb.from('activity').select('id,name,start_date,end_date,baseline_start,baseline_end,progress,weight,status,contractor_id'),
    sb.from('deliverable').select('id,name,status,activity_id'),
    sb.from('milestone').select('name,planned_date,actual_date,status').order('ord'),
    sb.from('cost_line').select('budget,committed,actual_cost'),
    sb.from('contractor').select('id,name,color'),
    sb.from('report').select('week_of,summary_md').order('created_at', { ascending: false }).limit(1),
  ]);

  const acts = (activities ?? []) as (ActivityLite & { contractor_id: string | null })[];
  const m = computeMetrics(acts, (costs ?? []).map(c => ({ budget: Number(c.budget) || 0, actual_cost: Number(c.actual_cost) || 0 })));
  const health = healthLabel(m);
  const wk = programmeWeek(project?.start_date, project?.end_date);
  const series = sCurve(acts);
  const todayLabel = new Date().toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  const approvals = (deliverables ?? []).filter(d => isAwaitingDecision(d.status));
  const budget = (costs ?? []).reduce((s, c) => s + (Number(c.budget) || 0), 0);
  const committed = (costs ?? []).reduce((s, c) => s + (Number(c.committed) || 0), 0);
  const spent = (costs ?? []).reduce((s, c) => s + (Number(c.actual_cost) || 0), 0);
  const perf = (contractors ?? []).map(c => {
    const own = acts.filter(a => a.contractor_id === c.id);
    if (!own.length) return null;
    const cm = computeMetrics(own);
    return { name: c.name, color: c.color, earned: cm.progress, planned: cm.plannedToday };
  }).filter(Boolean).sort((a, b) => b!.earned - a!.earned) as { name: string; color: string; earned: number; planned: number }[];
  const upcomingMs = (milestones ?? []).filter(ms => ms.status !== 'achieved').slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      {/* Executive hero */}
      <section className="relative overflow-hidden rounded-hero bg-[#0D0E0C] text-chalk shadow-e3">
        <div className="absolute inset-0 opacity-70"><Elevation className="h-full w-full" frame="wide" align="xMaxYMid" annotations={false} /></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,14,12,.95)_10%,rgba(13,14,12,.55)_55%,rgba(13,14,12,.2))]" />
        <div className="relative flex flex-col gap-8 p-7 sm:p-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[560px]">
            <div className="eyebrow text-stone">Owner overview{wk ? ` · week ${wk.week}${wk.total ? ` of ${wk.total}` : ''}` : ''}</div>
            <h1 className="display mt-3 text-[clamp(40px,6vw,72px)] text-chalk">{project?.name ?? 'Villa Ajloun'}</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-stone">
              <span className="text-chalk">{m.progress}% complete</span> against {m.plannedToday}% planned — {m.spi >= 1 ? 'at or ahead of schedule' : 'behind the planned schedule'}.
              {' '}{approvals.length ? <><span className="text-bronze">{approvals.length} decision{approvals.length === 1 ? '' : 's'}</span> await you.</> : 'Nothing awaits your decision.'}
            </p>
            <div className="mt-6"><AskButton prompt="Write me a concise owner briefing: where the project stands, what changed recently, the risks, and the decisions I need to make." variant="secondary">Brief me</AskButton></div>
          </div>
          <div className="flex items-center gap-6">
            <Ring value={m.progress / 100} marker={m.plannedToday / 100} size={132} stroke={6} label="complete" color="rgb(var(--c-bronze))" className="[&_.display]:text-chalk [&_circle:first-child]:stroke-chalk" />
            <div className="flex flex-col gap-3 text-[12px]">
              <div><div className="eyebrow text-[9.5px] text-stone">Health</div><div className="mt-1 flex items-center gap-1.5 text-chalk"><span className="h-1.5 w-1.5 rounded-full" style={{ background: toneColor[health.tone] }} />{health.label} · <span className="num">{m.health}</span></div></div>
              <div><div className="eyebrow text-[9.5px] text-stone">SPI</div><div className="num mt-1 text-chalk">{m.spi.toFixed(2)}</div></div>
              <div><div className="eyebrow text-[9.5px] text-stone">Handover</div><div className="num mt-1 text-chalk">{fmtDate(project?.end_date)}</div></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal>
          <Panel className="h-full p-6">
            <PanelHeader label="Decisions awaiting you" meta={approvals.length} action={<Link href="/deliverables?status=awaiting" className="text-[12px] text-muted hover:text-ink">All →</Link>} />
            <div className="mt-2 flex flex-col divide-y divide-line">
              {approvals.slice(0, 8).map(d => <ApprovalRow key={d.id} id={d.id} name={d.name} activityId={d.activity_id} status={d.status} />)}
            </div>
            {approvals.length === 0 && <EmptyState compact title="Nothing to decide" body="New submissions appear here as soon as they are sent for review." />}
          </Panel>
        </Reveal>
        <Reveal delay={0.06}>
          <Panel className="h-full p-6">
            <PanelHeader label="Financial summary" />
            {budget > 0 ? (
              <div className="mt-5 flex flex-col gap-5">
                {[['Spent', spent], ['Committed', committed]].map(([k, v]) => (
                  <div key={k as string}>
                    <div className="flex items-baseline justify-between"><span className="text-[12.5px] text-muted">{k as string}</span><span className="num text-[13px] text-ink">{(v as number).toLocaleString()} <span className="text-faint">/ {budget.toLocaleString()} {project?.currency}</span></span></div>
                    <ProgressBar className="mt-2" value={((v as number) / budget) * 100} marker={k === 'Spent' ? m.progress : undefined} />
                  </div>
                ))}
                <p className="text-[11px] text-faint">Tick on “Spent” marks earned progress · CPI {m.cpi ?? '—'}</p>
              </div>
            ) : (
              <EmptyState compact title="No cost data recorded" body={<>Add budget lines to <code className="num">cost_line</code> to see spend, commitments and CPI. No figures are estimated.</>} />
            )}
          </Panel>
        </Reveal>
      </div>

      <Reveal>
        <Panel className="p-6 pb-12">
          <PanelHeader label="Progress over time" meta="planned cumulative" />
          <div className="mt-5"><SCurve data={series} todayLabel={todayLabel} todayPlanned={m.plannedToday} todayActual={m.progress} /></div>
        </Panel>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-1">
          <Panel className="h-full p-6">
            <PanelHeader label="Contractor performance" />
            <ul className="mt-5 flex flex-col gap-4">
              {perf.map(p => (
                <li key={p.name}>
                  <div className="flex justify-between text-[12.5px]"><span className="truncate text-ink">{p.name}</span><span className="num text-[11px] text-muted">{p.earned}% / {p.planned}%</span></div>
                  <ProgressBar className="mt-2" value={p.earned} marker={p.planned} height={3} tone={p.color} />
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel className="h-full p-6">
            <PanelHeader label="Upcoming milestones" />
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {upcomingMs.map(ms => (
                <li key={ms.name} className="flex items-center gap-3 py-3">
                  <span className="h-2 w-2 rotate-45 border border-accent" />
                  <span className="flex-1 text-[13px] text-ink">{ms.name}</span>
                  <span className="text-right"><span className="num block text-[11px] text-ink-2">{fmtDate(ms.planned_date, { day: 'numeric', month: 'short', year: '2-digit' })}</span><span className="block text-[10.5px] text-faint">{relDays(ms.planned_date)}</span></span>
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>
        <Reveal delay={0.1}>
          <Panel className="h-full p-6">
            <PanelHeader label="Latest report" meta={reports?.[0]?.week_of ? `week of ${fmtDate(reports[0].week_of, { day: 'numeric', month: 'short' })}` : undefined}
              action={<Link href="/reports" className="text-[12px] text-muted hover:text-ink">All →</Link>} />
            {reports?.[0]?.summary_md
              ? <p className="mt-4 line-clamp-[9] whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{reports[0].summary_md}</p>
              : <EmptyState compact title="No report yet" />}
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
