'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function upsertTeamMember(input: { email: string; role: string; contractorId?: string | null; fullName?: string }) {
  const sb = await createClient();
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email.' };

  const row = { email, role: input.role, contractor_id: input.contractorId || null, full_name: input.fullName?.trim() || null };
  // team_member is the source of truth; RLS allows admin only.
  const { error } = await sb.from('team_member').upsert(row, { onConflict: 'email' });
  if (error) return { ok: false, error: error.message };

  // If they already signed up, update their live profile immediately.
  await sb.from('profile').update({ role: input.role as any, contractor_id: input.contractorId || null, full_name: row.full_name }).eq('email', email);

  revalidatePath('/team');
  return { ok: true };
}

export async function removeTeamMember(email: string) {
  const sb = await createClient();
  const { error } = await sb.from('team_member').delete().eq('email', email.toLowerCase());
  if (error) return { ok: false, error: error.message };
  // demote any live profile back to contractor (least privilege)
  await sb.from('profile').update({ role: 'contractor' as any, contractor_id: null }).eq('email', email.toLowerCase());
  revalidatePath('/team');
  return { ok: true };
}
