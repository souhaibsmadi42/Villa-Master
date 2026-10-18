import { createClient } from '@/lib/supabase/server';
import { fmtDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import { GanttChart, type GanttActivity, type GanttStage, type GanttContractor, type GanttDep, type GanttMilestone } from '@/components/gantt/GanttChart';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Timeline' };

export default async function TimelinePage() {
  const sb = await createClient();

  // RLS scopes activities to what the user may see (contractor → own scope).
  const [{ data: activities }, { data: stages }, { data: contractors }, { data: deps }, { data: milestones }] = await Promise.all([
    sb.from('activity').select('id,name,stage_id,contractor_id,start_date,end_date,baseline_start,baseline_end,progress,status,is_critical').order('sort'),
    sb.from('stage').select('id,name,ord').order('ord'),
    sb.from('contractor').select('id,name,color').order('name'),
    sb.from('activity_dependency').select('predecessor_id,successor_id'),
    sb.from('milestone').select('id,name,planned_date,actual_date,status').order('ord'),
  ]);

  const acts = (activities ?? []) as GanttActivity[];
  // Only show contractor chips that actually have visible activities.
  const visible = new Set(acts.map(a => a.contractor_id));
  const chips = ((contractors ?? []) as GanttContractor[]).filter(c => visible.has(c.id));
  const first = acts.reduce<string | null>((m, a) => (!m || a.start_date < m ? a.start_date : m), null);
  const last = acts.reduce<string | null>((m, a) => (!m || a.end_date > m ? a.end_date : m), null);
  const critical = acts.filter(a => a.is_critical).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Programme" title={<>Master <em className="italic text-accent">timeline</em></>}
        sub={first && last ? <>From {fmtDate(first)} to {fmtDate(last)}. Every activity, dependency and milestone, drawn against today.</> : undefined}>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
          {[['Activities', acts.length], ['Dependencies', (deps ?? []).length], ['Critical path', critical], ['Milestones', (milestones ?? []).length]].map(([k, v]) => (
            <div key={k as string}><dt className="eyebrow text-[9.5px]">{k}</dt><dd className="num mt-0.5 text-[15px] text-ink">{v}</dd></div>
          ))}
        </dl>
      </PageHeader>

      {acts.length > 0 ? (
        <GanttChart activities={acts} stages={(stages ?? []) as GanttStage[]} contractors={chips} deps={(deps ?? []) as GanttDep[]} milestones={(milestones ?? []) as GanttMilestone[]} now={Date.now()} />
      ) : (
        <Panel>
          <EmptyState title="No activities visible"
            body={<>If you just deployed, run <code className="num">npm run seed</code>. Contractors only see activities in their own scope.</>} />
        </Panel>
      )}
    </div>
  );
}
