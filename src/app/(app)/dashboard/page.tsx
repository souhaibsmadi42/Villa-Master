import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { MetricBlock } from '@/components/ui/MetricBlock';
import { Ring } from '@/components/ui/Ring';
import { Pill } from '@/components/ui/Pill';
import { SCurve } from '@/components/charts/SCurve';
import { LiveFeed } from '@/components/dashboard/LiveFeed';
import { computeMetrics, sCurve } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const profile = await getSessionProfile();
  const sb = await createClient();

  const [{ data: project }, { data: activities }, { data: deliverables }, { data: milestones }, { data: costs }, { data: events }, { data: snaps }] = await Promise.all([
    sb.from('project').select('*').limit(1).single(),
    sb.from('activity').select('id,name,start_date,end_date,baseline_start,baseline_end,progress,weight,status'),
    sb.from('deliverable').select('id,name,status,priority,due_date,activity_id'),
    sb.from('milestone').select('name,planned_date,actual_date,status').order('ord'),
    sb.from('cost_line').select('budget,actual_cost'),
    sb.from('event_log').select('actor_name,verb,subject_text,subject_type,at').order('at', { ascending: false }).limit(8),
    sb.from('progress_snapshot').select('at,earned').order('at'),
  ]);

  const acts = activities ?? [];
  const m = computeMetrics(acts as any, (costs ?? []) as any);
  const todayLabel = new Date().toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  // merge recorded actual snapshots into the planned curve as an "earned" line
  const earnedByLabel: Record<string, number> = {};
  for (const s of snaps ?? []) earnedByLabel[new Date(s.at).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })] = Number(s.earned);
  const series = sCurve(acts as any).map(p => ({ ...p, earned: earnedByLabel[p.label] ?? null }));

  const dels = deliverables ?? [];
  const pendingApproval = dels.filter(d => d.status === 'submitted' || d.status === 'under_review');
  const delayed = acts.filter(a => a.status === 'delayed');
  const upcoming = dels.filter(d => d.due_date).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)).slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Villa Ajloun · {profile?.role}</Eyebrow>
        <h1 className="font-display text-[clamp(30px,5vw,52px)] tracking-tighter mt-1">Project Control</h1>
        <p className="text-stone text-[13px]">{project ? `${project.location} · ${project.start_date} → ${project.end_date}` : ''}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassPanel className="p-5 flex items-center justify-between">
          <div><Eyebrow>Health</Eyebrow><div className="text-stone text-[12px] mt-2">{m.spi >= 1 ? 'on track' : 'behind plan'}</div></div>
          <Ring value={m.health / 100} size={72} label="score" />
        </GlassPanel>
        <GlassPanel className="p-5"><MetricBlock value={m.progress} unit="%" label="Progress" size="lg" sub={`planned ${m.plannedToday}% by today`} /></GlassPanel>
        <GlassPanel className="p-5">
          <Eyebrow>SPI</Eyebrow>
          <div className="font-display text-[48px] leading-none tracking-tighter mt-1" style={{ color: m.spi >= 1 ? 'var(--c-olive)' : 'var(--c-iron)' }}>{m.spi.toFixed(2)}</div>
          <div className="text-stone text-[12px]">schedule performance</div>
        </GlassPanel>
        <GlassPanel className="p-5">
          <Eyebrow>CPI</Eyebrow>
          <div className="font-display text-[48px] leading-none tracking-tighter mt-1">{m.cpi != null ? m.cpi.toFixed(2) : '—'}</div>
          <div className="text-stone text-[12px]">{m.cpi != null ? 'cost performance' : 'add budgets for CPI'}</div>
        </GlassPanel>
      </div>

      {/* S-curve */}
      <GlassPanel className="p-6">
        <Eyebrow>Progress S-curve — planned vs actual</Eyebrow>
        <div className="mt-3">
          <SCurve data={series} todayLabel={todayLabel} todayPlanned={m.plannedToday} todayActual={m.progress} />
        </div>
      </GlassPanel>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Pending approvals */}
        <GlassPanel className="p-6">
          <Eyebrow>Pending approvals · {pendingApproval.length}</Eyebrow>
          <div className="mt-3 flex flex-col gap-2">
            {pendingApproval.slice(0, 6).map(d => (
              <Link key={d.id} href={`/activities/${d.activity_id}`} className="flex items-center gap-3 rounded-card bg-surface-2 border border-border px-3 py-2 hover:border-border-2">
                <span className="text-[12.5px] text-text flex-1">{d.name}</span>
                <Pill tone="brass">{d.status.replace('_', ' ')}</Pill>
              </Link>
            ))}
            {pendingApproval.length === 0 && <p className="text-stone text-[12.5px] italic">Nothing awaiting approval.</p>}
          </div>
        </GlassPanel>

        {/* Upcoming deliverables */}
        <GlassPanel className="p-6">
          <Eyebrow>Upcoming deliverables</Eyebrow>
          <div className="mt-3 flex flex-col gap-2">
            {upcoming.map(d => (
              <Link key={d.id} href={`/activities/${d.activity_id}`} className="flex items-center gap-3 rounded-card bg-surface-2 border border-border px-3 py-2 hover:border-border-2">
                <span className="text-[12.5px] text-text flex-1">{d.name}</span>
                <span className="num text-[11px] text-stone">{d.due_date}</span>
              </Link>
            ))}
            {upcoming.length === 0 && <p className="text-stone text-[12.5px] italic">No dated deliverables.</p>}
          </div>
        </GlassPanel>

        {/* Delayed */}
        <GlassPanel className="p-6">
          <Eyebrow>Delayed activities · {delayed.length}</Eyebrow>
          <div className="mt-3 flex flex-col gap-2">
            {delayed.slice(0, 6).map(a => (
              <Link key={a.id} href={`/activities/${a.id}`} className="flex items-center gap-3 rounded-card bg-iron/8 border border-iron/25 px-3 py-2">
                <span className="text-[12.5px] text-text flex-1">{a.name}</span><Pill tone="iron">delayed</Pill>
              </Link>
            ))}
            {delayed.length === 0 && <p className="text-stone text-[12.5px] italic">No delayed activities. 🎯</p>}
          </div>
        </GlassPanel>

        {/* Activity feed (realtime) */}
        <GlassPanel className="p-6">
          <Eyebrow>Recent activity · live</Eyebrow>
          <LiveFeed initial={(events ?? []) as any} />
        </GlassPanel>
      </div>

      {/* Milestone rail */}
      <GlassPanel className="p-6">
        <Eyebrow>Milestones</Eyebrow>
        <div className="mt-4 flex flex-wrap gap-3">
          {(milestones ?? []).map((ms, i) => (
            <div key={i} className="flex-1 min-w-[160px] rounded-card border border-border bg-surface-2 p-3">
              <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${ms.status === 'achieved' ? 'bg-olive' : 'bg-brass'}`} /><Pill tone={ms.status === 'achieved' ? 'olive' : 'stone'}>{ms.status}</Pill></div>
              <div className="text-[13px] text-text mt-2 leading-tight">{ms.name}</div>
              <div className="num text-[10.5px] text-stone mt-1">{ms.actual_date || ms.planned_date}</div>
            </div>
          ))}
        </div>
      </GlassPanel>

      <p className="text-stone text-[12px]">SPI = earned ÷ planned-by-today. Health blends schedule (SPI), on-time ratio, and overall progress. All RLS-scoped to your role.</p>
    </div>
  );
}
