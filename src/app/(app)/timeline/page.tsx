import { createClient } from '@/lib/supabase/server';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { GanttChart } from '@/components/gantt/GanttChart';

export const dynamic = 'force-dynamic';

export default async function TimelinePage() {
  const sb = await createClient();

  // RLS scopes activities to what the user may see (contractor → own scope).
  const [{ data: activities }, { data: stages }, { data: contractors }, { data: deps }] = await Promise.all([
    sb.from('activity').select('id,name,stage_id,contractor_id,start_date,end_date,baseline_start,baseline_end,progress,status,is_critical').order('sort'),
    sb.from('stage').select('id,name,ord').order('ord'),
    sb.from('contractor').select('id,name,color').order('name'),
    sb.from('activity_dependency').select('predecessor_id,successor_id'),
  ]);

  // Only show contractor chips that actually have visible activities.
  const visibleContractorIds = new Set((activities ?? []).map(a => a.contractor_id));
  const chips = (contractors ?? []).filter(c => visibleContractorIds.has(c.id));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Eyebrow>Villa Ajloun · Programme</Eyebrow>
        <h1 className="font-display text-[clamp(28px,4vw,44px)] tracking-tighter mt-1">Master Timeline</h1>
        <p className="text-stone text-[13px]">{(activities ?? []).length} activities · {(deps ?? []).length} dependencies</p>
      </div>

      {activities && activities.length > 0 ? (
        <GanttChart
          activities={activities as any}
          stages={(stages ?? []) as any}
          contractors={chips as any}
          deps={(deps ?? []) as any}
        />
      ) : (
        <p className="text-stone italic">No activities visible. If you just deployed, run <code className="num">npm run seed</code>; if you are a contractor, only your scope appears here.</p>
      )}
    </div>
  );
}
