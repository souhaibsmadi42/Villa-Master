'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/** Moves the whole programme so it starts on `start` (YYYY-MM-DD). Admin only — enforced in the database. */
export async function rescheduleProgramme(projectId: string, start: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return { ok: false as const, error: 'Pick a valid start date.' };
  const sb = await createClient();
  const { data, error } = await sb.rpc('reschedule_programme', { p_project: projectId, p_start: start });
  if (error) {
    if (/forbidden/i.test(error.message)) return { ok: false as const, error: 'Only admins can reschedule the programme.' };
    if (error.code === 'PGRST202' || /could not find the function/i.test(error.message))
      return { ok: false as const, error: 'The database is missing reschedule_programme. Run supabase/migrations/0004_reschedule.sql in the Supabase SQL editor, then try again.' };
    return { ok: false as const, error: error.message };
  }
  for (const p of ['/timeline', '/dashboard', '/milestones', '/deliverables', '/contractors', '/owner', '/map']) revalidatePath(p);
  revalidatePath('/', 'layout');
  return { ok: true as const, days: (data as number) ?? 0 };
}
