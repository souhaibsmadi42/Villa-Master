import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { TeamEditor } from '@/components/team/TeamEditor';

export const dynamic = 'force-dynamic';

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
  const byEmail = new Map<string, any>();
  (members ?? []).forEach(m => byEmail.set(m.email, m));
  (profiles ?? []).forEach(p => { if (p.email !== profile.email && !byEmail.has(p.email)) byEmail.set(p.email, p); });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Villa Ajloun · Administration</Eyebrow>
        <h1 className="font-display text-[clamp(28px,4vw,44px)] tracking-tighter mt-1">Team &amp; Permissions</h1>
        <p className="text-stone text-[13px]">Add people by email and choose what each one can see.</p>
      </div>
      <TeamEditor members={Array.from(byEmail.values())} contractors={(contractors ?? []) as any} />
    </div>
  );
}
