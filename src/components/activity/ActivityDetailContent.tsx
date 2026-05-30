import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';
import { ProgressEditor } from '@/components/activity/ProgressEditor';
import { DeliverableList } from '@/components/activity/DeliverableList';
import { CommentThread } from '@/components/activity/CommentThread';

const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// Shared by the full page and the timeline drawer (intercepting route).
export async function ActivityDetailContent({ id }: { id: string }) {
  const sb = await createClient();
  const profile = await getSessionProfile();

  const { data: activity } = await sb
    .from('activity')
    .select('*, contractor:contractor_id(name,color), stage:stage_id(name), building:building_id(name)')
    .eq('id', id).single();
  if (!activity) notFound();

  const [{ data: deliverables }, { data: deps }, { data: comments }] = await Promise.all([
    sb.from('deliverable').select('id,name,category,priority,status,due_date').eq('activity_id', id).order('created_at'),
    sb.from('activity_dependency').select('predecessor:predecessor_id(id,name)').eq('successor_id', id),
    sb.from('comment').select('id,body,created_at').eq('subject_type', 'activity').eq('subject_id', id).order('created_at'),
  ]);

  const role = profile?.role ?? 'contractor';
  const canEdit = role === 'admin' || role === 'consultant'
    || (role === 'contractor' && activity.contractor_id === profile?.contractorId);
  const days = Math.round((+new Date(activity.end_date) - +new Date(activity.start_date)) / 86400000);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>{activity.stage?.name ?? 'Activity'}</Eyebrow>
        <h1 className="font-display text-[clamp(24px,4vw,38px)] tracking-tighter mt-1">{activity.name}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-[12.5px] text-stone">
          {activity.contractor && <Pill tone="olive" dot>{activity.contractor.name}</Pill>}
          {activity.building && <Pill tone="stone">{activity.building.name}</Pill>}
          {activity.is_critical && <Pill tone="iron">critical path</Pill>}
          <span className="num">{fmt(activity.start_date)} → {fmt(activity.end_date)} · {days} days</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="flex flex-col gap-5">
          <GlassPanel className="p-5">
            <Eyebrow>Description</Eyebrow>
            <p className="text-[13.5px] text-text-2 leading-relaxed mt-2">{activity.description || '—'}</p>
            {!!(deps && deps.length) && (
              <div className="mt-4">
                <Eyebrow>Depends on</Eyebrow>
                <ul className="mt-2 flex flex-col gap-1">
                  {deps.map((d: any, i: number) => d.predecessor && (
                    <li key={i}><Link href={`/activities/${d.predecessor.id}`} className="text-[12.5px] text-olive hover:underline">↳ {d.predecessor.name}</Link></li>
                  ))}
                </ul>
              </div>
            )}
          </GlassPanel>
          <GlassPanel className="p-5">
            <DeliverableList activityId={id} projectId={activity.project_id} contractorId={activity.contractor_id} canEdit={canEdit} initial={(deliverables ?? []) as any} />
          </GlassPanel>
          <GlassPanel className="p-5">
            <CommentThread projectId={activity.project_id} activityId={id} initial={(comments ?? []).map((c: any) => ({ id: c.id, body: c.body, created_at: c.created_at }))} />
          </GlassPanel>
        </div>
        <div className="flex flex-col gap-5">
          <GlassPanel className="p-5"><ProgressEditor id={id} progress={activity.progress} status={activity.status} canEdit={canEdit} /></GlassPanel>
          <GlassPanel className="p-5">
            <Eyebrow>Schedule</Eyebrow>
            <dl className="mt-3 text-[12.5px] flex flex-col gap-2">
              {[['Baseline start', fmt(activity.baseline_start)], ['Baseline end', fmt(activity.baseline_end)],
                ['Planned start', fmt(activity.start_date)], ['Planned end', fmt(activity.end_date)],
                ['Actual start', fmt(activity.actual_start)], ['Actual end', fmt(activity.actual_end)]].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border pb-1.5"><dt className="text-stone">{k}</dt><dd className="num text-text-2">{v}</dd></div>
              ))}
            </dl>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
