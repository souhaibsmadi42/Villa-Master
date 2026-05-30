import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Ring } from '@/components/ui/Ring';
import { Pill } from '@/components/ui/Pill';
import { SCurve } from '@/components/charts/SCurve';
import { ApprovalRow } from '@/components/owner/ApprovalRow';
import { computeMetrics, sCurve } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export default async function OwnerPage() {
  const profile = await getSessionProfile();
  if (!profile || !['admin', 'owner'].includes(profile.role)) redirect('/dashboard');
  const sb = await createClient();

  const [{ data: project }, { data: activities }, { data: deliverables }, { data: milestones }, { data: costs }, { data: contractors }, { data: reports }] = await Promise.all([
    sb.from('project').select('*').limit(1).single(),
    sb.from('activity').select('id,name,start_date,end_date,baseline_start,baseline_end,progress,weight,status,contractor_id'),
    sb.from('deliverable').select('id,name,status,activity_id'),
    sb.from('milestone').select('name,planned_date,actual_date,status').order('ord'),
    sb.from('cost_line').select('budget,committed,actual_cost'),
    sb.from('contractor').select('id,name'),
    sb.from('report').select('week_of,summary_md').order('created_at', { ascending: false }).limit(1),
  ]);

  const acts = activities ?? [];
  const m = computeMetrics(acts as any, (costs ?? []) as any);
  const series = sCurve(acts as any);
  const todayLabel = new Date().toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  const approvals = (deliverables ?? []).filter(d => d.status === 'submitted' || d.status === 'under_review');

  const budget = (costs ?? []).reduce((s, c) => s + (c.budget || 0), 0);
  const spent = (costs ?? []).reduce((s, c) => s + (c.actual_cost || 0), 0);

  // contractor performance: avg progress per contractor
  const perf = (contractors ?? []).map(c => {
    const own = acts.filter(a => a.contractor_id === c.id);
    const W = own.reduce((s, a) => s + (a.weight || 1), 0) || 1;
    const prog = Math.round(own.reduce((s, a) => s + (a.weight || 1) * a.progress, 0) / W);
    return { name: c.name, progress: own.length ? prog : 0, count: own.length };
  }).filter(p => p.count).sort((a, b) => b.progress - a.progress);

  const upcomingMs = (milestones ?? []).filter(ms => ms.status !== 'achieved').slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      {/* Executive hero */}
      <div className="rounded-panel bg-gradient-to-br from-bark to-[#2A3E2C] text-cream p-8 flex flex-wrap items-center justify-between gap-6">
        <div>
          <Eyebrow><span className="text-sand">Owner overview</span></Eyebrow>
          <h1 className="font-display text-[clamp(30px,5vw,52px)] font-light mt-2">Villa Ajloun</h1>
          <p className="text-sand text-[13.5px] mt-1">
            {m.progress}% complete · {m.spi >= 1 ? 'on schedule' : 'behind plan'} · {approvals.length} decision{approvals.length === 1 ? '' : 's'} await you
          </p>
        </div>
        <Ring value={m.progress / 100} size={96} label="complete" />
      </div>

      <GlassPanel className="p-6">
        <Eyebrow>Progress over time</Eyebrow>
        <div className="mt-3"><SCurve data={series} todayLabel={todayLabel} todayPlanned={m.plannedToday} todayActual={m.progress} /></div>
      </GlassPanel>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Approvals required */}
        <GlassPanel className="p-6">
          <Eyebrow>Approvals required · {approvals.length}</Eyebrow>
          <div className="mt-3 flex flex-col gap-2">
            {approvals.slice(0, 8).map(d => <ApprovalRow key={d.id} id={d.id} name={d.name} activityId={d.activity_id} status={d.status} />)}
            {approvals.length === 0 && <p className="text-stone text-[13px] italic">Nothing needs your decision right now.</p>}
          </div>
        </GlassPanel>

        {/* Financial summary */}
        <GlassPanel className="p-6">
          <Eyebrow>Financial summary</Eyebrow>
          {budget > 0 ? (
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="num text-[28px] font-display">{spent.toLocaleString()} </span>
                <span className="text-stone text-[12px]">of {budget.toLocaleString()} {project?.currency}</span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-sand/50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-olive to-brass" style={{ width: `${Math.min(100, Math.round(spent / budget * 100))}%` }} />
              </div>
              <div className="text-[12px] text-stone mt-2">{Math.round(spent / budget * 100)}% of budget committed</div>
            </div>
          ) : (
            <p className="text-stone text-[13px] italic mt-3">Add budget figures to <code className="num">cost_line</code> to see the financial summary and CPI.</p>
          )}
        </GlassPanel>

        {/* Contractor performance */}
        <GlassPanel className="p-6">
          <Eyebrow>Contractor performance</Eyebrow>
          <div className="mt-3 flex flex-col gap-2.5">
            {perf.map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-[12.5px] text-text-2 w-32 truncate">{p.name}</span>
                <div className="flex-1 h-2 rounded-full bg-sand/50 overflow-hidden"><div className="h-full bg-gradient-to-r from-olive to-brass" style={{ width: `${p.progress}%` }} /></div>
                <span className="num text-[11px] text-stone w-9 text-right">{p.progress}%</span>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Upcoming milestones + latest report */}
        <GlassPanel className="p-6">
          <Eyebrow>Upcoming milestones</Eyebrow>
          <div className="mt-3 flex flex-col gap-2">
            {upcomingMs.map((ms, i) => (
              <div key={i} className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-brass" /><span className="text-[12.5px] flex-1">{ms.name}</span><span className="num text-[11px] text-stone">{ms.planned_date}</span></div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <Eyebrow>Latest report</Eyebrow>
            <p className="text-[12.5px] text-text-2 mt-2 leading-relaxed line-clamp-4">{reports?.[0]?.summary_md ?? 'No report yet.'}</p>
            <Link href="/reports" className="text-[12px] text-olive font-semibold hover:underline mt-2 inline-block">All reports →</Link>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
