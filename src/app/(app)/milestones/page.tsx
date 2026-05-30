import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { MilestoneEditor } from '@/components/milestones/MilestoneEditor';

export const dynamic = 'force-dynamic';

export default async function MilestonesPage() {
  const sb = await createClient();
  const profile = await getSessionProfile();
  const canEdit = profile?.role === 'admin' || profile?.role === 'consultant';

  const { data: milestones } = await sb.from('milestone').select('id,name,planned_date,actual_date,status').order('ord');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Villa Ajloun · Programme</Eyebrow>
        <h1 className="font-display text-[clamp(28px,4vw,44px)] tracking-tighter mt-1">Milestones</h1>
        <p className="text-stone text-[13px]">Planned vs actual, with delay tracking.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(milestones ?? []).map(ms => <MilestoneEditor key={ms.id} ms={ms as any} canEdit={canEdit} />)}
      </div>
      {(!milestones || milestones.length === 0) && <p className="text-stone italic">No milestones — run <code className="num">npm run seed</code>.</p>}
    </div>
  );
}
