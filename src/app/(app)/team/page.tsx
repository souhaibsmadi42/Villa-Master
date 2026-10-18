import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/PageHeader';
import { TeamEditor } from '@/components/team/TeamEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Team & access' };

export default async function TeamPage() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'admin') redirect('/dashboard');
  const sb = await createClient();

  const [{ data: members }, { data: profiles }, { data: contractors }] = await Promise.all([
    sb.from('team_member').select('email,role,contractor_id,full_name'),
    sb.from('profile').select('email,role,contractor_id,full_name'),
    sb.from('contractor').select('id,name').order('name'),
  ]);

  // Merge: team_member roster + any signed-in profiles not yet in the roster (excluding the admin).
  type Person = { email: string; role: string; contractor_id: string | null; full_name: string | null };
  const byEmail = new Map<string, Person>();
  (members ?? []).forEach(m => byEmail.set(m.email, m));
  (profiles ?? []).forEach(p => { if (p.email !== profile.email && !byEmail.has(p.email)) byEmail.set(p.email, p); });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Administration" title={<>Team <em className="italic text-accent">&amp; access</em></>}
        sub="Add people by email and choose what each one can see. Access is enforced by the database, not just the interface." />
      <TeamEditor members={Array.from(byEmail.values())} contractors={contractors ?? []} />
    </div>
  );
}
