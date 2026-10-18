import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import { DeliverablesWorkspace, type DRow } from '@/components/deliverables/DeliverablesWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Deliverables' };

export default async function DeliverablesPage({ searchParams }: { searchParams: Promise<{ status?: string; focus?: string }> }) {
  const sp = await searchParams;
  const profile = await getSessionProfile();
  const sb = await createClient();

  const [{ data: dels }, { data: acts }, { data: contractors }, { data: approvals }, { data: profiles }] = await Promise.all([
    sb.from('deliverable').select('id,name,status,priority,category,due_date,notes,activity_id,project_id,contractor_id,updated_at,created_at'),
    sb.from('activity').select('id,name'),
    sb.from('contractor').select('id,name,color').order('name'),
    sb.from('approval').select('subject_id,decision,decided_at,created_at,reviewer,comment').eq('subject_type', 'deliverable').order('created_at', { ascending: false }),
    sb.from('profile').select('user_id,email,full_name'),
  ]);

  const actName = new Map((acts ?? []).map(a => [a.id, a.name]));
  const who = new Map((profiles ?? []).map(p => [p.user_id, p.full_name || p.email]));
  const rows: DRow[] = (dels ?? []).map(d => ({
    ...d,
    activity_name: actName.get(d.activity_id) ?? null,
    history: (approvals ?? []).filter(a => a.subject_id === d.id).map(a => ({
      decision: a.decision, at: a.decided_at ?? a.created_at, by: a.reviewer ? who.get(a.reviewer) ?? null : null, comment: a.comment,
    })),
  }));

  const role = profile?.role ?? 'contractor';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Delivery" title={<>Deliverables <em className="italic text-accent">&amp; approvals</em></>}
        sub="Every submission on the programme — what is due, what is waiting on a decision, and what has been approved." />
      {rows.length ? (
        <DeliverablesWorkspace rows={rows} contractors={contractors ?? []} initialStatus={sp.status ?? null} focusId={sp.focus ?? null}
          role={role} myContractorId={profile?.contractorId ?? null} />
      ) : (
        <Panel><EmptyState title="No deliverables yet" body="Deliverables are created from an activity. Open any activity on the timeline to add one." /></Panel>
      )}
    </div>
  );
}
