'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateMilestone(id: string, patch: { actual_date?: string | null; status?: string; planned_date?: string | null }) {
  const sb = await createClient();
  const clean: Record<string, unknown> = {};
  if ('actual_date' in patch) clean.actual_date = patch.actual_date || null;
  if ('planned_date' in patch) clean.planned_date = patch.planned_date || null;
  if (patch.status) clean.status = patch.status;
  const { error } = await sb.from('milestone').update(clean).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/milestones'); revalidatePath('/dashboard');
  return { ok: true };
}
