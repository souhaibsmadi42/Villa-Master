import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/Controls';
import { EmptyState } from '@/components/ui/States';
import { MilestoneEditor, type MS } from '@/components/milestones/MilestoneEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Milestones' };

export default async function MilestonesPage() {
  const sb = await createClient();
  const profile = await getSessionProfile();
  const canEdit = profile?.role === 'admin' || profile?.role === 'consultant';
  const { data: milestones } = await sb.from('milestone').select('id,name,planned_date,actual_date,status').order('ord');
  const list = (milestones ?? []) as MS[];
  const achieved = list.filter(m => m.status === 'achieved').length;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Programme" title={<>The road <em className="italic text-accent">to handover</em></>}
        sub={canEdit ? 'Record actual dates as milestones land — delays are calculated against the planned date.' : 'Planned against actual, with delay tracking.'}>
        {list.length > 0 && (
          <div className="mt-6 max-w-[420px]">
            <div className="num flex justify-between text-[11.5px] text-muted"><span><span className="text-ink">{achieved}</span> of {list.length} achieved</span><span>{Math.round((achieved / list.length) * 100)}%</span></div>
            <ProgressBar className="mt-2" value={(achieved / list.length) * 100} tone="rgb(var(--c-success))" />
          </div>
        )}
      </PageHeader>
      {list.length ? (
        <ol className="relative">
          <span aria-hidden className="absolute bottom-6 left-[8.5px] top-6 w-px bg-line" />
          {list.map((ms, i) => <MilestoneEditor key={ms.id} ms={ms} canEdit={canEdit} index={i} today={today} />)}
        </ol>
      ) : (
        <Panel><EmptyState title="No milestones yet" body={<>Run <code className="num">npm run seed</code> to load the programme milestones.</>} /></Panel>
      )}
    </div>
  );
}
