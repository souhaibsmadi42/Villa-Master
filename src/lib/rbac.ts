import { createClient } from '@/lib/supabase/server';

export type Role = 'admin' | 'owner' | 'consultant' | 'contractor';

export interface SessionProfile {
  userId: string;
  email: string;
  role: Role;
  contractorId: string | null;
  fullName: string | null;
}

/** Returns the signed-in user's profile (role + scope), or null if not signed in. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from('profile')
    .select('user_id, email, role, contractor_id, full_name')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    // Trigger should have created it; fall back to a default contractor profile.
    return { userId: user.id, email: user.email ?? '', role: 'contractor', contractorId: null, fullName: null };
  }
  return {
    userId: profile.user_id,
    email: profile.email ?? user.email ?? '',
    role: (profile.role as Role) ?? 'contractor',
    contractorId: profile.contractor_id ?? null,
    fullName: profile.full_name ?? null,
  };
}

export const canManageTeam = (r: Role) => r === 'admin';
export const seesEverything = (r: Role) => r === 'admin' || r === 'owner' || r === 'consultant';
