import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { fmtDate, daysBetween } from '@/lib/format';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ProgressEditor } from '@/components/activity/ProgressEditor';
import { DeliverableList } from '@/components/activity/DeliverableList';
import { CommentThread } from '@/components/activity/CommentThread';

type Rel<T> = T | T[] | null;
const one = <T,>(r: Rel<T>) => (Array.isArray(r) ? r[0] ?? null : r);

// Shared by the full page and the timeline drawer (intercepting route).
export async function ActivityDetailContent({ id }: { id: string }) {
  const sb = await createClient();
  const profile = await getSessionProfile();

  const { data: activity } = await sb
    .from('activity')
    .select('*, contractor:contractor_id(id,name,color), stage:stage_id(name), building:building_id(name)')
    .eq('id', id).single();
  if (!activity) notFound();

  const [{ data: deliverables }, { data: preds }, { data: succs }, { data: comments }] = await Promise.all([
    sb.from('deliverable').select('id,name,category,priority,status,due_date').eq('activity_id', id).order('created_at'),
    sb.from('activity_dependency').select('predecessor:predecessor_id(id,name,progress,status)').eq('successor_id', id),
    sb.from('activity_dependency').select('successor:successor_id(id,name,progress,status)').eq('predecessor_id', id),
    sb.from('comment').select('id,body,created_at').eq('subject_type', 'activity').eq('subject_id', id).order('created_at'),
  ]);

  const contractor = one(activity.contractor as Rel<{ id: string; name: string; color: string }>);
  const stage = one(activity.stage as Rel<{ name: string }>);
  const building = one(activity.building as Rel<{ name: string }>);
  const role = profile?.role ?? 'contractor';
  const canEdit = role === 'admin' || role === 'consultant'
    || (role === 'contractor' && activity.contractor_id === profile?.contractorId);
  const days = daysBetween(activity.start_date, activity.end_date);
  const slip = activity.baseline_end ? daysBetween(activity.baseline_end, activity.end_date) : 0;
  type Dep = { id: string; name: string; progress: number; status: string };
  const before = (preds ?? []).map(p => one(p.predecessor as Rel<Dep>)).filter(Boolean) as Dep[];
  const after = (succs ?? []).map(p => one(p.successor as Rel<Dep>)).filter(Boolean) as Dep[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow flex items-center gap-2"><span className="h-px w-4 bg-current opacity-50" />{stage?.name ?? 'Activity'}</div>
        <h1 className="display mt-3 text-[clamp(28px,4vw,44px)] text-ink">{activity.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {contractor && (
            <Link href={`/contractors/${contractor.id}`} className="inline-flex h-[22px] items-center gap-1.5 rounded-[6px] border border-line bg-raised px-2 text-[11px] text-ink-2 hover:border-line-strong">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: contractor.color }} />{contractor.name}
            </Link>
          )}
          {building && <Badge>{building.name}</Badge>}
          {activity.is_critical && <Badge tone="critical">critical path</Badge>}
          <span className="num ml-1 text-[11.5px] text-muted">{fmtDate(activity.start_date)} → {fmtDate(activity.end_date)} · {days} days</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel className="p-5">
            <PanelHeader label="Description" />
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{activity.description || 'No description recorded.'}</p>
            {(before.length > 0 || after.length > 0) && (
              <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                {[['Depends on', before], ['Unlocks', after]].map(([label, list]) => (list as Dep[]).length > 0 && (
                  <div key={label as string}>
                    <div className="eyebrow mb-2 text-[9.5px]">{label as string}</div>
                    <ul className="flex flex-col gap-1.5">
                      {(list as Dep[]).map(d => (
                        <li key={d.id}><Link href={`/activities/${d.id}`} className="group flex items-center gap-2 text-[12.5px] text-ink hover:text-accent">
                          <span className="min-w-0 flex-1 truncate">{d.name}</span><span className="num text-[10.5px] text-faint">{d.progress}%</span><ArrowUpRight size={12} className="text-faint group-hover:text-accent" />
                        </Link></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel className="p-5">
            <DeliverableList activityId={id} projectId={activity.project_id} contractorId={activity.contractor_id} canEdit={canEdit} initial={deliverables ?? []} />
          </Panel>
          <Panel className="p-5">
            <CommentThread projectId={activity.project_id} activityId={id} initial={(comments ?? []).map(c => ({ id: c.id, body: c.body, created_at: c.created_at }))} />
          </Panel>
        </div>
        <div className="flex flex-col gap-5">
          <Panel className="p-5"><ProgressEditor id={id} progress={activity.progress} status={activity.status} canEdit={canEdit} /></Panel>
          <Panel className="p-5">
            <PanelHeader label="Schedule" meta={slip ? <span className={slip > 0 ? 'text-critical' : 'text-success'}>{slip > 0 ? `+${slip}d vs baseline` : `${slip}d vs baseline`}</span> : 'on baseline'} />
            <dl className="mt-3 flex flex-col text-[12.5px]">
              {[['Baseline', activity.baseline_start, activity.baseline_end], ['Planned', activity.start_date, activity.end_date], ['Actual', activity.actual_start, activity.actual_end]].map(([k, s, e]) => (
                <div key={k as string} className="grid grid-cols-[80px_1fr] items-baseline gap-3 border-b border-line py-2.5 last:border-0">
                  <dt className="text-muted">{k as string}</dt>
                  <dd className="num text-[12px] text-ink-2">{fmtDate(s as string | null)} <span className="text-faint">→</span> {fmtDate(e as string | null)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
